import { useInvoicesStore } from '@/stores/invoicesStore'
import { useCustomersStore } from '@/stores/customersStore'
import type { AITool } from './types'

export const invoiceTools: AITool[] = [
  {
    name: 'create_invoice',
    description: 'Erstellt eine neue Rechnung. WICHTIG: Nutze zuerst list_customers um die Kunden-ID zu finden.',
    parameters: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'Die ID des Kunden (aus list_customers)' },
        customer_name: { type: 'string', description: 'Oder der Name des Kunden zum Suchen' },
        items: { type: 'string', description: 'JSON-Array mit Positionen: [{"description": "...", "quantity": 1, "unit_price": 100}]' },
        currency: { type: 'string', description: 'Währung', enum: ['EUR', 'USD', 'CHF'] },
        notes: { type: 'string', description: 'Notizen zur Rechnung' }
      },
      required: []
    },
    execute: async (args, ctx) => {
      const { createInvoice } = useInvoicesStore.getState()
      const { fetchCustomers } = useCustomersStore.getState()

      // Parse items
      let items = []
      if (args.items) {
        try {
          items = JSON.parse(args.items as string)
        } catch {
          items = [{ description: 'Position 1', quantity: 1, unit_price: 100 }]
        }
      } else {
        items = [{ description: 'Position 1', quantity: 1, unit_price: 100 }]
      }

      // Find customer
      let customerId = args.customer_id ? parseInt(args.customer_id as string) : null
      if (!customerId && args.customer_name) {
        await fetchCustomers()
        const customers = useCustomersStore.getState().customers
        const found = customers.find(c =>
          c.name.toLowerCase().includes((args.customer_name as string).toLowerCase()) ||
          (c.company && c.company.toLowerCase().includes((args.customer_name as string).toLowerCase()))
        )
        if (found) customerId = found.id
      }

      if (!customerId) {
        return 'Kein Kunde gefunden. Bitte gib eine Kunden-ID oder einen Kundennamen an. Nutze "list_customers" um alle Kunden zu sehen.'
      }

      const today = new Date().toISOString().split('T')[0]
      const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const invoice = await createInvoice({
        customer_id: customerId,
        issue_date: today,
        due_date: dueDate,
        currency: (args.currency as string) || 'EUR',
        notes: (args.notes as string) || '',
        items: items.map((item: { description: string; quantity?: number; unit_price: number }, idx: number) => ({
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unit_price,
          position: idx + 1
        }))
      })

      if (invoice) {
        ctx.openWindow('transactions')
        ctx.onClose()
        return `Rechnung ${invoice.number} wurde erfolgreich erstellt.`
      }
      return 'Fehler beim Erstellen der Rechnung.'
    }
  },

  {
    name: 'list_invoices',
    description: 'Listet Rechnungen auf mit optionalem Statusfilter',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filtert nach Status', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] },
        search: { type: 'string', description: 'Suchbegriff (Rechnungsnummer oder Kunde)' }
      },
      required: []
    },
    execute: async (args) => {
      const { fetchInvoices } = useInvoicesStore.getState()
      await fetchInvoices(args.status as string, args.search as string)

      const invoices = useInvoicesStore.getState().invoices
      if (invoices.length === 0) {
        return args.status ? `Keine Rechnungen mit Status "${args.status}".` : 'Keine Rechnungen vorhanden.'
      }

      const list = invoices.map(i =>
        `- [ID ${i.id}] ${i.number}: ${i.customer_name} - ${i.total} ${i.currency} (${i.status})`
      ).join('\n')

      return `Rechnungen:\n${list}`
    }
  },

  {
    name: 'mark_invoice_paid',
    description: 'Markiert eine Rechnung als bezahlt',
    parameters: {
      type: 'object',
      properties: {
        invoice_id: { type: 'string', description: 'Die ID der Rechnung' }
      },
      required: ['invoice_id']
    },
    execute: async (args, ctx) => {
      const { markAsPaid } = useInvoicesStore.getState()
      const invoiceId = parseInt(args.invoice_id as string)

      const invoice = await markAsPaid(invoiceId)
      if (invoice) {
        ctx.openWindow('transactions')
        return `Rechnung ${invoice.number} wurde als bezahlt markiert.`
      }
      return `Rechnung mit ID ${invoiceId} wurde nicht gefunden.`
    }
  },

  {
    name: 'mark_invoice_sent',
    description: 'Markiert eine Rechnung als versendet',
    parameters: {
      type: 'object',
      properties: {
        invoice_id: { type: 'string', description: 'Die ID der Rechnung' }
      },
      required: ['invoice_id']
    },
    execute: async (args, ctx) => {
      const { markAsSent } = useInvoicesStore.getState()
      const invoiceId = parseInt(args.invoice_id as string)

      const invoice = await markAsSent(invoiceId)
      if (invoice) {
        ctx.openWindow('transactions')
        return `Rechnung ${invoice.number} wurde als versendet markiert.`
      }
      return `Rechnung mit ID ${invoiceId} wurde nicht gefunden.`
    }
  }
]

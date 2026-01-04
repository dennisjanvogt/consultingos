import { useCustomersStore } from '@/stores/customersStore'
import type { AITool } from './types'

export const customerTools: AITool[] = [
  {
    name: 'create_customer',
    description: 'Erstellt einen neuen Kunden in der Stammdatenverwaltung',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name des Kunden (Pflichtfeld)' },
        company: { type: 'string', description: 'Firmenname' },
        email: { type: 'string', description: 'E-Mail-Adresse' },
        phone: { type: 'string', description: 'Telefonnummer' },
        street: { type: 'string', description: 'Straße und Hausnummer' },
        zip_code: { type: 'string', description: 'Postleitzahl' },
        city: { type: 'string', description: 'Stadt' },
        country: { type: 'string', description: 'Land (Standard: Deutschland)' },
        tax_id: { type: 'string', description: 'Steuernummer/USt-ID' },
        notes: { type: 'string', description: 'Notizen zum Kunden' }
      },
      required: ['name']
    },
    execute: async (args, ctx) => {
      const { createCustomer } = useCustomersStore.getState()

      const customer = await createCustomer({
        name: args.name as string,
        company: (args.company as string) || '',
        email: (args.email as string) || '',
        phone: (args.phone as string) || '',
        street: (args.street as string) || '',
        zip_code: (args.zip_code as string) || '',
        city: (args.city as string) || '',
        country: (args.country as string) || 'Deutschland',
        tax_id: (args.tax_id as string) || '',
        notes: (args.notes as string) || ''
      })

      if (customer) {
        ctx.openWindow('masterdata')
        ctx.onClose()
        return `Kunde "${args.name}" wurde erfolgreich angelegt (ID: ${customer.id}).`
      }
      return 'Fehler beim Anlegen des Kunden.'
    }
  },

  {
    name: 'list_customers',
    description: 'Listet alle Kunden auf, um deren IDs zu finden',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Suchbegriff zum Filtern' }
      },
      required: []
    },
    execute: async (args) => {
      const { fetchCustomers, customers } = useCustomersStore.getState()
      await fetchCustomers(args.search as string)

      const currentCustomers = useCustomersStore.getState().customers
      if (currentCustomers.length === 0) {
        return args.search ? `Keine Kunden gefunden für "${args.search}".` : 'Keine Kunden vorhanden.'
      }

      const list = currentCustomers.map(c =>
        `- ID ${c.id}: ${c.name}${c.company ? ` (${c.company})` : ''}`
      ).join('\n')

      return `Kundenliste:\n${list}`
    }
  },

  {
    name: 'update_customer',
    description: 'Aktualisiert einen bestehenden Kunden',
    parameters: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'Die ID des Kunden' },
        name: { type: 'string', description: 'Neuer Name' },
        company: { type: 'string', description: 'Neue Firma' },
        email: { type: 'string', description: 'Neue E-Mail' },
        phone: { type: 'string', description: 'Neue Telefonnummer' },
        street: { type: 'string', description: 'Neue Straße' },
        zip_code: { type: 'string', description: 'Neue PLZ' },
        city: { type: 'string', description: 'Neue Stadt' },
        notes: { type: 'string', description: 'Neue Notizen' }
      },
      required: ['customer_id']
    },
    execute: async (args, ctx) => {
      const { updateCustomer } = useCustomersStore.getState()
      const customerId = parseInt(args.customer_id as string)

      const updates: Record<string, unknown> = {}
      if (args.name) updates.name = args.name
      if (args.company) updates.company = args.company
      if (args.email) updates.email = args.email
      if (args.phone) updates.phone = args.phone
      if (args.street) updates.street = args.street
      if (args.zip_code) updates.zip_code = args.zip_code
      if (args.city) updates.city = args.city
      if (args.notes) updates.notes = args.notes

      const customer = await updateCustomer(customerId, updates as any)
      if (customer) {
        ctx.openWindow('masterdata')
        return `Kunde "${customer.name}" wurde aktualisiert.`
      }
      return `Kunde mit ID ${customerId} wurde nicht gefunden.`
    }
  },

  {
    name: 'delete_customer',
    description: 'Löscht einen Kunden aus der Datenbank',
    parameters: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'Die ID des zu löschenden Kunden' }
      },
      required: ['customer_id']
    },
    execute: async (args) => {
      const { deleteCustomer } = useCustomersStore.getState()
      const customerId = parseInt(args.customer_id as string)
      const success = await deleteCustomer(customerId)

      if (success) {
        return `Kunde mit ID ${customerId} wurde gelöscht.`
      }
      return `Kunde mit ID ${customerId} wurde nicht gefunden oder konnte nicht gelöscht werden.`
    }
  }
]

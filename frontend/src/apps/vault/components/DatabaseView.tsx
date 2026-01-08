import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Table, LayoutGrid, Trash2, GripVertical, Check, X } from 'lucide-react'
import { useVaultStore } from '@/stores/vaultStore'
import type { VaultDatabase, DatabaseRow, DatabaseColumn, ColumnOption } from '@/stores/vaultStore'

interface DatabaseViewProps {
  pageId: number
}

type ViewMode = 'table' | 'kanban'

export function DatabaseView({ pageId }: DatabaseViewProps) {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [editingCell, setEditingCell] = useState<{ rowId: number; columnId: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const {
    currentDatabase,
    fetchDatabase,
    createDatabase,
    createRow,
    updateRow,
    deleteRow,
  } = useVaultStore()

  useEffect(() => {
    fetchDatabase(pageId)
  }, [pageId, fetchDatabase])

  const handleCreateDatabase = async () => {
    await createDatabase(pageId)
  }

  const handleAddRow = async () => {
    if (!currentDatabase) return
    // Create with default empty data
    const defaultData: Record<string, unknown> = {}
    currentDatabase.schema.columns.forEach((col) => {
      if (col.type === 'title') {
        defaultData[col.id] = ''
      } else if (col.type === 'checkbox') {
        defaultData[col.id] = false
      } else if (col.type === 'select') {
        defaultData[col.id] = ''
      } else if (col.type === 'multi_select') {
        defaultData[col.id] = []
      } else {
        defaultData[col.id] = ''
      }
    })
    await createRow(pageId, defaultData)
  }

  const handleCellEdit = (rowId: number, columnId: string, currentValue: unknown) => {
    setEditingCell({ rowId, columnId })
    setEditValue(String(currentValue || ''))
  }

  const handleCellSave = async () => {
    if (!editingCell || !currentDatabase) return

    const row = currentDatabase.rows.find((r) => r.id === editingCell.rowId)
    if (!row) return

    const newData = { ...row.data, [editingCell.columnId]: editValue }
    await updateRow(pageId, editingCell.rowId, newData)
    setEditingCell(null)
    setEditValue('')
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleDeleteRow = async (rowId: number) => {
    await deleteRow(pageId, rowId)
  }

  const handleCheckboxToggle = async (row: DatabaseRow, columnId: string) => {
    const newValue = !row.data[columnId]
    const newData = { ...row.data, [columnId]: newValue }
    await updateRow(pageId, row.id, newData)
  }

  const handleSelectChange = async (row: DatabaseRow, columnId: string, value: string) => {
    const newData = { ...row.data, [columnId]: value }
    await updateRow(pageId, row.id, newData)
  }

  // No database yet
  if (!currentDatabase) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Table className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {t('vault.noDatabase', 'Diese Seite hat noch keine Datenbank')}
        </p>
        <button
          onClick={handleCreateDatabase}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('vault.createDatabase', 'Datenbank erstellen')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'table'
                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
            title="Table View"
          >
            <Table className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'kanban'
                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
            title="Kanban View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleAddRow}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('vault.newRow', 'Neu')}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'table' ? (
          <TableView
            database={currentDatabase}
            editingCell={editingCell}
            editValue={editValue}
            onCellEdit={handleCellEdit}
            onCellSave={handleCellSave}
            onCellCancel={handleCellCancel}
            onDeleteRow={handleDeleteRow}
            onCheckboxToggle={handleCheckboxToggle}
            onSelectChange={handleSelectChange}
            setEditValue={setEditValue}
          />
        ) : (
          <KanbanView
            database={currentDatabase}
            onSelectChange={handleSelectChange}
            onDeleteRow={handleDeleteRow}
          />
        )}
      </div>
    </div>
  )
}

// Table View Component
interface TableViewProps {
  database: VaultDatabase
  editingCell: { rowId: number; columnId: string } | null
  editValue: string
  onCellEdit: (rowId: number, columnId: string, currentValue: unknown) => void
  onCellSave: () => void
  onCellCancel: () => void
  onDeleteRow: (rowId: number) => void
  onCheckboxToggle: (row: DatabaseRow, columnId: string) => void
  onSelectChange: (row: DatabaseRow, columnId: string, value: string) => void
  setEditValue: (value: string) => void
}

function TableView({
  database,
  editingCell,
  editValue,
  onCellEdit,
  onCellSave,
  onCellCancel,
  onDeleteRow,
  onCheckboxToggle,
  onSelectChange,
  setEditValue,
}: TableViewProps) {
  const columns = database.schema.columns

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-50 dark:bg-gray-800/50">
          <th className="w-8" />
          {columns.map((col) => (
            <th
              key={col.id}
              className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700"
            >
              {col.name}
            </th>
          ))}
          <th className="w-10" />
        </tr>
      </thead>
      <tbody>
        {database.rows.map((row) => (
          <tr
            key={row.id}
            className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800"
          >
            <td className="px-2 py-1 text-gray-400 opacity-0 group-hover:opacity-100">
              <GripVertical className="w-4 h-4" />
            </td>
            {columns.map((col) => (
              <td key={col.id} className="px-3 py-1">
                <CellRenderer
                  column={col}
                  value={row.data[col.id]}
                  row={row}
                  isEditing={editingCell?.rowId === row.id && editingCell?.columnId === col.id}
                  editValue={editValue}
                  onEdit={() => onCellEdit(row.id, col.id, row.data[col.id])}
                  onSave={onCellSave}
                  onCancel={onCellCancel}
                  onCheckboxToggle={() => onCheckboxToggle(row, col.id)}
                  onSelectChange={(value) => onSelectChange(row, col.id, value)}
                  setEditValue={setEditValue}
                />
              </td>
            ))}
            <td className="px-2 py-1">
              <button
                onClick={() => onDeleteRow(row.id)}
                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Cell Renderer Component
interface CellRendererProps {
  column: DatabaseColumn
  value: unknown
  row: DatabaseRow
  isEditing: boolean
  editValue: string
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onCheckboxToggle: () => void
  onSelectChange: (value: string) => void
  setEditValue: (value: string) => void
}

function CellRenderer({
  column,
  value,
  isEditing,
  editValue,
  onEdit,
  onSave,
  onCancel,
  onCheckboxToggle,
  onSelectChange,
  setEditValue,
}: CellRendererProps) {
  // Checkbox
  if (column.type === 'checkbox') {
    const checked = Boolean(value)
    return (
      <button
        onClick={onCheckboxToggle}
        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
          checked
            ? 'bg-violet-600 border-violet-600 text-white'
            : 'border-gray-300 dark:border-gray-600 hover:border-violet-500'
        }`}
      >
        {checked && <Check className="w-3 h-3" />}
      </button>
    )
  }

  // Select
  if (column.type === 'select' && column.options) {
    const selectedOption = column.options.find((o) => o.id === value)
    return (
      <select
        value={String(value || '')}
        onChange={(e) => onSelectChange(e.target.value)}
        className="w-full px-2 py-1 text-sm bg-transparent border-0 focus:ring-2 focus:ring-violet-500 rounded cursor-pointer"
      >
        <option value="">-</option>
        {column.options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.value}
          </option>
        ))}
      </select>
    )
  }

  // Text, Title, Number, Date, URL - editable
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave()
            if (e.key === 'Escape') onCancel()
          }}
          autoFocus
          className="w-full px-2 py-1 text-sm border border-violet-500 rounded focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800"
        />
        <button onClick={onSave} className="p-1 text-green-500 hover:text-green-600">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // Display value
  const displayValue = String(value || '')
  return (
    <div
      onClick={onEdit}
      className={`px-2 py-1 text-sm cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[28px] ${
        column.type === 'title' ? 'font-medium' : ''
      }`}
    >
      {displayValue || <span className="text-gray-300 dark:text-gray-600">-</span>}
    </div>
  )
}

// Kanban View Component
interface KanbanViewProps {
  database: VaultDatabase
  onSelectChange: (row: DatabaseRow, columnId: string, value: string) => void
  onDeleteRow: (rowId: number) => void
}

function KanbanView({ database, onSelectChange, onDeleteRow }: KanbanViewProps) {
  // Find the kanban column (select type)
  const kanbanColumnId = database.kanban_column_id
  const kanbanColumn = database.schema.columns.find((c) => c.id === kanbanColumnId)
  const titleColumn = database.schema.columns.find((c) => c.type === 'title')

  if (!kanbanColumn || kanbanColumn.type !== 'select' || !kanbanColumn.options) {
    return (
      <div className="p-8 text-center text-gray-500">
        Keine Select-Spalte für Kanban-Ansicht konfiguriert
      </div>
    )
  }

  // Group rows by kanban column value
  const groups: Record<string, DatabaseRow[]> = {}

  // Initialize with empty arrays for each option plus "No Status"
  groups[''] = []
  kanbanColumn.options.forEach((opt) => {
    groups[opt.id] = []
  })

  // Distribute rows into groups
  database.rows.forEach((row) => {
    const groupId = String(row.data[kanbanColumnId] || '')
    if (groups[groupId]) {
      groups[groupId].push(row)
    } else {
      groups[''].push(row)
    }
  })

  const getOptionColor = (optionId: string) => {
    const option = kanbanColumn.options?.find((o) => o.id === optionId)
    const colors: Record<string, string> = {
      gray: 'bg-gray-100 dark:bg-gray-700',
      red: 'bg-red-100 dark:bg-red-900/30',
      orange: 'bg-orange-100 dark:bg-orange-900/30',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/30',
      green: 'bg-green-100 dark:bg-green-900/30',
      blue: 'bg-blue-100 dark:bg-blue-900/30',
      purple: 'bg-purple-100 dark:bg-purple-900/30',
      pink: 'bg-pink-100 dark:bg-pink-900/30',
    }
    return colors[option?.color || 'gray'] || colors.gray
  }

  return (
    <div className="flex gap-4 p-4 overflow-x-auto h-full">
      {/* No Status Column */}
      {groups[''].length > 0 && (
        <KanbanColumn
          title="Kein Status"
          color="bg-gray-100 dark:bg-gray-700"
          rows={groups['']}
          titleColumn={titleColumn}
          kanbanColumnId={kanbanColumnId}
          options={kanbanColumn.options}
          onSelectChange={onSelectChange}
          onDeleteRow={onDeleteRow}
        />
      )}

      {/* Status Columns */}
      {kanbanColumn.options.map((option) => (
        <KanbanColumn
          key={option.id}
          title={option.value}
          color={getOptionColor(option.id)}
          rows={groups[option.id]}
          titleColumn={titleColumn}
          kanbanColumnId={kanbanColumnId}
          options={kanbanColumn.options!}
          onSelectChange={onSelectChange}
          onDeleteRow={onDeleteRow}
        />
      ))}
    </div>
  )
}

interface KanbanColumnProps {
  title: string
  color: string
  rows: DatabaseRow[]
  titleColumn?: DatabaseColumn
  kanbanColumnId: string
  options: ColumnOption[]
  onSelectChange: (row: DatabaseRow, columnId: string, value: string) => void
  onDeleteRow: (rowId: number) => void
}

function KanbanColumn({
  title,
  color,
  rows,
  titleColumn,
  kanbanColumnId,
  options,
  onSelectChange,
  onDeleteRow,
}: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-72">
      {/* Column Header */}
      <div className={`px-3 py-2 rounded-t-lg ${color}`}>
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-gray-700 dark:text-gray-200">{title}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{rows.length}</span>
        </div>
      </div>

      {/* Column Content */}
      <div className="bg-gray-50 dark:bg-gray-800/30 rounded-b-lg p-2 min-h-[200px] space-y-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="group bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                  {titleColumn ? String(row.data[titleColumn.id] || 'Untitled') : `Row ${row.id}`}
                </div>
              </div>
              <button
                onClick={() => onDeleteRow(row.id)}
                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Status Change */}
            <div className="mt-2">
              <select
                value={String(row.data[kanbanColumnId] || '')}
                onChange={(e) => onSelectChange(row, kanbanColumnId, e.target.value)}
                className="w-full px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded"
              >
                <option value="">-</option>
                {options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

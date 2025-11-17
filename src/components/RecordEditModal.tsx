import React, { useState, useEffect } from 'react';
import type { AirtableRecord } from '../types';

interface FieldConfig {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'date' | 'email' | 'tel' | 'select' | 'checkbox';
    options?: string[];
}

interface TableConfig {
    label: string;
    schema: any;
    fieldConfig: FieldConfig[];
}

interface RecordEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: AirtableRecord<any> | null; // Null for creation mode
    tableConfig: TableConfig;
    onSave: (recordId: string | null, fields: any) => void;
    isSaving: boolean;
}

const RecordEditModal: React.FC<RecordEditModalProps> = ({ isOpen, onClose, record, tableConfig, onSave, isSaving }) => {
    const [formData, setFormData] = useState<any>({});
    const isCreateMode = !record;

    useEffect(() => {
        const initialData: { [key: string]: any } = {};
        tableConfig.fieldConfig.forEach(field => {
            if (isCreateMode) {
                // Set default values for new records
                initialData[field.key] = field.type === 'checkbox' ? false : field.type === 'number' ? 0 : '';
            } else {
                const airtableKey = tableConfig.schema[field.key] || field.key;
                initialData[field.key] = record?.fields[airtableKey];
            }
        });
        setFormData(initialData);
    }, [record, tableConfig, isCreateMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checkedValue = (e.target as HTMLInputElement).checked;
        setFormData((prev: any) => ({
            ...prev,
            [name]: isCheckbox ? checkedValue : value,
        }));
    };

    const handleSave = () => {
        onSave(record ? record.id : null, formData);
    };
    
    if (!isOpen) return null;

    const renderField = (field: FieldConfig) => {
        const value = formData[field.key] ?? '';
        switch (field.type) {
            case 'textarea':
                return <textarea name={field.key} value={value} onChange={handleChange} rows={4} className="form-input" />;
            case 'select':
                return (
                    <select name={field.key} value={value} onChange={handleChange} className="form-input">
                        <option value="">Seleccionar...</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                );
            case 'checkbox':
                return (
                     <div className="flex items-center h-full mt-2">
                        <input type="checkbox" name={field.key} checked={!!value} onChange={handleChange} className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500" />
                    </div>
                );
            default:
                return <input type={field.type} name={field.key} value={value} onChange={handleChange} className="form-input" />;
        }
    };
    
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold">{isCreateMode ? 'Creando Nuevo Registro en' : 'Editando en'} <span className="text-blue-600">{tableConfig.label}</span></h3>
                </header>
                <main className="p-6 space-y-4 overflow-y-auto">
                    {tableConfig.fieldConfig.map(field => (
                        <div key={field.key}>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{field.label}</label>
                            {renderField(field)}
                        </div>
                    ))}
                </main>
                <footer className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-400 flex items-center gap-2">
                        {isSaving ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/><span>Guardando...</span></> : 'Guardar Cambios'}
                    </button>
                </footer>
            </div>
             <style>{`
                .form-input {
                    display: block;
                    width: 100%;
                    border-radius: 0.5rem;
                    border: 1px solid #cbd5e1;
                    padding: 0.75rem 1rem;
                    font-size: 0.875rem;
                    background-color: #f8fafc;
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                    transition: all 0.2s;
                }
                .dark .form-input {
                    background-color: #1e293b;
                    border-color: #475569;
                    color: #f1f5f9;
                }
                .form-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgb(59 130 246 / 0.2);
                }
            `}</style>
        </div>
    );
};

export default RecordEditModal;

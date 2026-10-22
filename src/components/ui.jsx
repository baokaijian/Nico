import { useEffect, useId, useRef } from 'react';
export function Field({ field, value, onChange }) {
  const id = useId();
  const shown = value === true ? field.options?.[1] : value === false ? field.options?.[0] : value ?? '';
  const props = { id, name: field.key, value: shown, required: field.required, onChange: e => onChange(e.target.value), className: 'apple-input', 'aria-describedby': field.description ? `${id}-hint` : undefined };
  return <div className="form-group"><label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>{field.type === 'textarea' ? <textarea {...props} rows={3}/> : field.type === 'select' ? <select {...props}><option value="">{field.emptyLabel || '未填写'}</option>{field.options.map(o => <option key={o} value={o}>{field.optionLabels?.[o] || o}</option>)}{shown && !field.options.includes(shown) && <option value={shown}>{shown}（原始值）</option>}</select> : <><input {...props} type={field.type} min={field.min} max={field.max} step={field.integer ? 1 : field.step || 'any'} list={field.options ? `${id}-options` : undefined}/>{field.options && <datalist id={`${id}-options`}>{field.options.map(o => <option value={o} key={o}/>)}</datalist>}</>}{field.description && <small id={`${id}-hint`}>{field.description}</small>}</div>;
}
export function Message({ children, error = false }) { return children ? <div className={`notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{children}</div> : null; }
export function Empty({ children = '尚未录入记录。' }) { return <p className="empty">{children}</p>; }
export function Modal({ title, children, onClose, restoreFocus }) {
  const ref = useRef(null), titleId = useId(), restoreRef = useRef(restoreFocus);
  useEffect(() => {
    const previous = document.activeElement, restore = restoreRef.current;
    const dialog = ref.current;
    dialog.showModal();
    return () => { dialog.close(); if (restore) restore(); else previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose(); }}><div className="flex-between"><h2 id={titleId}>{title}</h2><button type="button" className="apple-btn apple-btn-secondary" onClick={onClose} aria-label="关闭弹窗">关闭</button></div>{children}</dialog>;
}

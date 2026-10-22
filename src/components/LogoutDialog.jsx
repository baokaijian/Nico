import { useState } from 'react';
import { createDraftStore } from '../services/drafts';
import { Message, Modal } from './ui';
export default function LogoutDialog({ api, onLogout, onClose, busy, error }) {
  const [summary] = useState(() => createDraftStore({ scope: api.getDraftScope() }).list());
  return <Modal title="退出账号与本机草稿" onClose={onClose}>
    <Message error>{error}</Message>
    <p>{summary.status === 'ready' ? `本账号在此设备有${summary.items.length}份未提交草稿。` : '暂时无法确认本机草稿数量。'} 草稿不会自动提交；其他账号和档案不会加载这些草稿。</p>
    <p>保留的草稿按最近编辑起7天有效；过期仍保留原件，须确认后恢复或自行删除。共享设备建议删除本账号草稿。</p>
    <p className="muted">删除仅处理本账号和本档案的新版草稿，服务端记录、其他账号草稿和未归属旧草稿均保留。</p>
    <div className="actions"><button type="button" className="apple-btn apple-btn-primary" disabled={busy} onClick={() => onLogout(false)}>退出并保留草稿</button><button type="button" className="apple-btn apple-btn-secondary danger" disabled={busy} onClick={() => onLogout(true)}>退出并删除本账号草稿</button><button type="button" className="apple-btn apple-btn-secondary" disabled={busy} onClick={onClose}>取消</button></div>
  </Modal>;
}

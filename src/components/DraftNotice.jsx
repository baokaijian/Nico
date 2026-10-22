import { Message } from './ui';
import { downloadJSON } from '../services/files';
export const draftHint = '草稿仅在此设备按账号和档案隔离，最近编辑起7天有效；过期须确认后恢复。退出时可保留或删除；不会自动提交。';
export default function DraftNotice({ draft, onRestore }) {
  const { found, legacy } = draft;
  return <>
    <Message error>{draft.warning || (found.status === 'unavailable' ? '此设备暂存不可用；输入可继续填写，请在离开前导出草稿。' : '')}</Message>
    {draft.blocked && <Message>{found.status === 'expired' ? '本账号的未提交草稿已过期，原件保留。' : found.status === 'corrupt' ? '本账号草稿格式损坏，未自动恢复或删除。' : '发现本账号在此设备的未提交草稿。'}{found.expiresAt && <span> 有效至{new Date(found.expiresAt).toLocaleString('zh-CN')}。</span>}
      {found.payload && <><button type="button" onClick={() => { const payload = draft.restore({ renewExpired: found.status === 'expired' }); if (payload) onRestore(payload); }}>{found.status === 'expired' ? '确认并恢复过期草稿' : '恢复草稿'}</button> <button type="button" onClick={() => downloadJSON('Nico-本账号未提交草稿.json', found.payload)}>导出草稿</button> </>}
      <button type="button" onClick={() => { if (window.confirm('仅删除当前账号此类型的本机草稿？服务端记录保持不变。')) draft.clear(); }}>删除此草稿</button><p>请先恢复、导出或删除这份草稿，再填写新记录，避免覆盖。</p>
    </Message>}
    {!draft.blocked && legacy.status === 'unowned' && <Message>发现旧版未归属草稿，已隔离，不会自动加载。<button type="button" onClick={draft.importLegacy}>确认归属并导入副本</button> 原旧草稿继续保留。</Message>}
  </>;
}

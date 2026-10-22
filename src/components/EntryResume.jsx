import useRecordDraft from '../services/useRecordDraft';
import { validEntryFlow } from '../services/entry-flow';
import { Message } from './ui';
export default function EntryResume({ api, openQuickEntry }) {
  const draft = useRecordDraft(api, 'quickEntry', validEntryFlow);
  return ['ready', 'expired', 'corrupt'].includes(draft.found.status) ? <Message>本账号有可恢复的录入流程或补充草稿。<button onClick={() => openQuickEntry('training')}>恢复连续录入</button></Message> : null;
}

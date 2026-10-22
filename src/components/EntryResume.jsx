import useRecordDraft from '../services/useRecordDraft';
import { validEntryFlow } from '../services/entry-flow';
import { Message } from './ui';
export default function EntryResume({ api, openQuickEntry }) {
  const draft = useRecordDraft(api, 'quickEntry', validEntryFlow);
  return ['ready', 'expired', 'corrupt'].includes(draft.found.status) ? <Message>本账号有未结束的连续录入。<button onClick={() => openQuickEntry('training')}>恢复连续录入</button></Message> : null;
}

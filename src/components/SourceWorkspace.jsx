import { lazy, Suspense } from 'react';
import { Modal, Message } from './ui';
const Records = lazy(() => import('./Records'));
const Skills = lazy(() => import('./Skills'));
const Goals = lazy(() => import('./GrowthGoals'));
const Media = lazy(() => import('./MediaGallery'));
const Practice = lazy(() => import('./Practice'));
const Plans = lazy(() => import('./PlanViewer'));
export default function SourceWorkspace({ source, onClose, ...props }) {
  const { collection, id } = source, row = props.data[collection]?.find(item => item.id === id);
  const shared = { ...props, focusId: id };
  return <Modal title="原记录工作区" onClose={onClose}><p className="source-id">{collection}/{id}</p>{!row ? <Message error>原记录不在当前可访问档案。请在管理设置的回收站核对，平台不会自动重建。</Message> : <Suspense fallback={<Message>正在打开原记录…</Message>}>
    {['swim','trainings','annotations','growth','fitness','nutrition'].includes(collection) && <Records {...shared} type={collection}/>}
    {['skillAssessments','skillDefinitions'].includes(collection) && <Skills {...shared} initialSection={collection === 'skillDefinitions' ? 'standards' : 'assessments'}/>}
    {['goals','milestones'].includes(collection) && <Goals {...shared}/>}
    {collection === 'media' && <Media {...shared}/>}
    {['weakpoints','checkins'].includes(collection) && <Practice {...shared}/>}
    {collection === 'plans' && <Plans {...shared}/>}
    <details><summary>完整原始记录</summary><pre className="source-json">{JSON.stringify(row, null, 2)}</pre></details>
  </Suspense>}</Modal>;
}

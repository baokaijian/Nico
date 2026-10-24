import { lazy, Suspense } from 'react';
import { Modal, Message } from './ui';
const VideoCompare = lazy(() => import('./VideoCompare'));
const Competitions = lazy(() => import('./CompetitionEvents'));
const Yearbooks = lazy(() => import('./Yearbooks'));
const Reports = lazy(() => import('./Reports'));
const Timeline = lazy(() => import('./GrowthTimeline'));
const Records = lazy(() => import('./Records'));
const Skills = lazy(() => import('./Skills'));
const Goals = lazy(() => import('./GrowthGoals'));
const Media = lazy(() => import('./MediaGallery'));
const Practice = lazy(() => import('./Practice'));
const Plans = lazy(() => import('./PlanViewer'));
const ChildSettings = lazy(() => import('./ChildSettings'));
export default function SourceWorkspace({ source, onClose, ...props }) {
  const { collection, id } = source, row = props.data[collection]?.find(item => item.id === id);
  const restricted=props.readOnly||!!props.role&&props.role!=='owner';
  const shared = { ...props, readOnly:restricted, manageTemplates:!restricted&&props.role==='owner', allowUpload:!restricted&&props.role==='owner', focusId: id };
  return <Modal title="原记录工作区" onClose={onClose}><details className="source-id-fold"><summary>记录标识</summary><p className="source-id">{collection}/{id}</p></details>{!row ? <Message error>原记录不在当前可访问档案。请在管理设置的回收站核对，平台不会自动重建。</Message> : <Suspense fallback={<Message>正在打开原记录…</Message>}>
    {['swim','trainings','annotations','growth','fitness','nutrition'].includes(collection) && <Records {...shared} type={collection}/>}
    {['skillAssessments','skillDefinitions'].includes(collection) && <Skills {...shared} initialSection={collection === 'skillDefinitions' ? 'standards' : 'assessments'}/>}
    {['goals','milestones'].includes(collection) && <Goals {...shared}/>}
    {collection === 'media' && <Media {...shared}/>}
    {collection==='weakpoints' && <Practice {...shared}/>}
    {collection==='checkins'&&<Records {...shared} type="checkins" allowAdd={false}/>}
    {collection==='trainingTemplates'&&<Records {...shared} type="trainings" focusId={undefined} focusTemplateId={id}/>}

    {collection === 'videoComparisons' && <VideoCompare {...shared}/>}
    {collection === 'competitionEvents' && <Competitions {...shared}/>}
    {collection === 'yearbooks' && <Yearbooks {...shared}/>}
    {collection === 'reportDrafts' && <Reports {...shared}/>}
    {collection === 'growthStories' && <Timeline {...shared}/>}
    {collection === 'plans' && <Plans {...shared}/>}
    {['childViews','childReflections'].includes(collection)&&<ChildSettings {...shared}/>}
    <details><summary>完整原始记录</summary><pre className="source-json">{JSON.stringify(row, null, 2)}</pre></details>
  </Suspense>}</Modal>;
}

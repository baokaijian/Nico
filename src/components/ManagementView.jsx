import { lazy, Suspense } from 'react';
import { MANAGEMENT_NAV, SETTINGS_VIEWS } from '../services/management';
import { Message } from './ui';
const Yearbooks = lazy(() => import('./Yearbooks'));
const Calendar = lazy(() => import('./TrainingCalendar'));
const VideoCompare = lazy(() => import('./VideoCompare'));
const Competitions = lazy(() => import('./CompetitionEvents'));
const GrowthTimeline = lazy(() => import('./GrowthTimeline'));
const DataQuality = lazy(() => import('./DataQuality'));
const GrowthWorkspace = lazy(() => import('./GrowthWorkspace'));
const Workbench = lazy(() => import('./Workbench'));
const Dashboard = lazy(() => import('./Dashboard'));
const Records = lazy(() => import('./Records'));
const Plans = lazy(() => import('./PlanViewer'));
const Practice = lazy(() => import('./Practice'));
const Skills = lazy(() => import('./Skills'));
const Goals = lazy(() => import('./GrowthGoals'));
const Reports = lazy(() => import('./Reports'));
const Gallery = lazy(() => import('./MediaGallery'));
const Profile = lazy(() => import('./Profile'));
const PrivateArchive = lazy(() => import('./PrivateArchive'));
const ChildSettings = lazy(() => import('./ChildSettings'));
const HealthPanel = lazy(() => import('./HealthPanel'));
export default function ManagementView({ location, navigate, data, api, onSaved, reload, readOnly, role, openQuickEntry, initialOpen, initialFilter, mediaTarget, resumeVersion, onEnterChild }) {
  const { section, view } = location, owner = role === 'owner';
  const shared = { data, api, onSaved, reload, readOnly, navigate };
  const views = section === 'settings' ? SETTINGS_VIEWS : MANAGEMENT_NAV.find(item => item.key === section)?.views || [];
  const archive = section === 'review' && ['archive', 'growth', 'fitness', 'nutrition'].includes(view);
  if (section === 'settings' && !owner) return <Message>管理设置仅限家长管理者。</Message>;
  return <div className="management-view stack">{section !== 'workbench' && <nav className="management-sections" aria-label={`${section === 'settings' ? '管理设置' : MANAGEMENT_NAV.find(item => item.key === section)?.label}分类`}>{views.map(([key, label]) => <button key={key} aria-current={view === key || archive && key === 'archive' ? 'page' : undefined} onClick={() => navigate(section, key)}>{label}</button>)}</nav>}
    {archive && <div className="ctx-tabs" role="group" aria-label="成长档案内容">{[['archive', '基础档案'], ['growth', '身体测量'], ['fitness', '体能测量'], ['nutrition', '恢复与饮食']].map(([key, label]) => <button key={key} aria-pressed={view === key} onClick={() => navigate('review', key)}>{label}</button>)}</div>}
    <Suspense fallback={<Message>正在打开记录…</Message>}>
      {section === 'workbench' && <Workbench {...shared} role={role} resumeVersion={resumeVersion} openQuickEntry={openQuickEntry}/>}
      {section === 'training' && ['trainings', 'swim'].includes(view) && <Records key={view} {...shared} type={view} readOnly={readOnly || !['owner', 'coach'].includes(role)} manageTemplates={owner} initialFilter={initialFilter} initialOpen={initialOpen} onLinkMedia={record => openQuickEntry('media', { trainingId: record.id })}/>}
      {section === 'training' && view === 'calendar' && <Calendar {...shared}/>}
      {section === 'training' && view === 'competitions' && <Competitions {...shared} readOnly={readOnly || !owner}/>}
      {section === 'training' && view === 'plans' && <Plans {...shared}/>}
      {(section === 'training' || section === 'review') && view === 'media' && <Gallery {...shared} key={`${section}/${mediaTarget?.recordId || ''}`} allowUpload={owner} initialRecord={mediaTarget}/>}
      {section === 'growth' && view === 'practice' && <Practice {...shared} manageSkills={owner}/>}
      {section === 'growth' && view === 'skills' && <GrowthWorkspace {...shared} manageSkills={owner}/>}
      {section === 'growth' && view === 'goals' && <Goals {...shared} readOnly={readOnly || !owner}/>}
      {section === 'review' && view === 'compare' && <VideoCompare {...shared} readOnly={readOnly || !owner}/>}
      {section === 'review' && view === 'timeline' && <GrowthTimeline {...shared} readOnly={readOnly || !owner}/>}
      {section === 'review' && view === 'quality' && <DataQuality {...shared} readOnly={readOnly || !owner}/>}
      {section === 'review' && view === 'trends' && <Dashboard {...shared} detailOnly/>}
      {section === 'review' && view === 'yearbooks' && <Yearbooks {...shared} readOnly={readOnly || !owner}/>}
      {section === 'review' && view === 'reports' && <Reports {...shared} readOnly={readOnly || !owner}/>}
      {archive && (view === 'archive' ? <Profile {...shared} role="viewer" view="archive" readOnly/> : <Records key={view} {...shared} type={view} readOnly={readOnly || !owner} initialFilter={initialFilter}/>)}
      {section === 'settings' && (view === 'privateArchive' ? <PrivateArchive {...shared}/> : view === 'child' ? <ChildSettings {...shared} onEnterChild={onEnterChild}/> : view === 'health' ? <HealthPanel api={api}/> : view === 'standards' ? <Skills {...shared} initialSection="standards"/> : <Profile {...shared} role={role} view={view}/>)}
    </Suspense>
  </div>;
}

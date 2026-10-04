import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  Activity as ActivityIcon, ArrowRight, Bell, BookOpen, CalendarDays, Check,
  ChevronRight, CircleHelp, Compass, HandHeart, HeartHandshake, Home, MapPin,
  Menu, MessageCircle, MessagesSquare, Plus, Search, Settings, Shield, Sparkles,
  Users, X, UserRound, Leaf, LockKeyhole, Send, Flag, UserRoundX, LogOut,
} from 'lucide-react';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import {
  type Activity,
  getGetDashboardQueryKey, getGetMyProfileQueryKey, getGetActivityQueryKey,
  getListPeopleQueryKey, getListConnectionsQueryKey, getListActivitiesQueryKey,
  getListSkillsQueryKey, getListProjectsQueryKey, getListCommunitiesQueryKey,
  getListNotificationsQueryKey, getListConversationsQueryKey, getListMessagesQueryKey,
  useGetMyProfile, useUpdateMyProfile, useGetDashboard, useListPeople,
  useListConnections, useCreateConnection, useUpdateConnection, useDeleteConnection,
  useListActivities, useCreateActivity, useGetActivity, useJoinActivity,
  useListSkills, useCreateSkill, useUpdateSkill, useDeleteSkill,
  useListProjects, useCreateProject, useJoinProject,
  useListCommunities, useJoinCommunity, useListNotifications, useMarkAllNotificationsRead,
  useListConversations, useListMessages, useSendMessage, useCreateReport, useBlockUser,
} from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';
import '@/index.css';

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
function stripBase(path: string) { return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path; }

const navPrimary = [
  { href: '/dashboard', label: 'Your day', icon: Home },
  { href: '/discover', label: 'Find your people', icon: Compass },
  { href: '/connections', label: 'Connections', icon: HeartHandshake },
  { href: '/activities', label: 'Things to do', icon: CalendarDays },
];
const navCommunity = [
  { href: '/skill-exchange', label: 'Skill exchange', icon: HandHeart },
  { href: '/community-board', label: 'Community board', icon: Leaf },
  { href: '/communities', label: 'Communities', icon: Users },
];
const navPersonal = [
  { href: '/messages', label: 'Messages', icon: MessagesSquare },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/profile', label: 'Your profile', icon: UserRound },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function Brand() {
  return <Link href="/" className="brand" data-testid="link-milaap-home"><span className="brand-mark" aria-hidden="true">m</span><span>milaap</span></Link>;
}
function PublicNav() {
  return <header className="public-nav"><Brand/><nav className="nav-links" aria-label="Main navigation">
    <Link href="/how-it-works">How it works</Link><Link href="/social-impact">Our impact</Link><Link href="/safety">Safety</Link>
    <Link href="/sign-in" className="text-link">Sign in</Link><Link href="/sign-up" className="button small">Join your community <ArrowRight size={15}/></Link>
  </nav></header>;
}
function Footer() {
  return <footer className="public-footer"><Brand/><div className="footer-links"><Link href="/how-it-works">How it works</Link><Link href="/safety">Safety</Link><Link href="/community-guidelines">Guidelines</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div><span>Small Connections. Real Belonging.</span></footer>;
}
function HomePage() {
  return <div className="app-shell">
    <PublicNav/>
    <main>
      <section className="hero">
        <div><div className="eyebrow">A more human kind of social</div><h1>Life feels better <em>together.</em></h1>
          <p className="hero-copy">Milaap brings neighbours, students, colleagues and older adults together around the small things that make a place feel like home.</p>
          <div className="hero-actions"><Link href="/sign-up" className="button">Find your people <ArrowRight size={16}/></Link><Link href="/how-it-works" className="button secondary">A little more about us</Link></div>
          <div className="hero-note"><div className="mini-avatars"><span>A</span><span>J</span><span>M</span><span>S</span></div><span>Made for real life, right where you are.</span></div>
        </div>
        <div className="hero-art" aria-label="Illustration of neighbours spending time together" role="img">
          <div className="art-sun"/><div className="art-ground"/><div className="art-ground two"/>
          <div className="people-scene"><div className="person"/><div className="person"/><div className="person"/></div>
          <div className="art-tag tag-one"><strong>A familiar face</strong>One street away</div>
          <div className="art-tag tag-two"><strong>Tea in the garden</strong>Saturday, together</div>
        </div>
      </section>
      <section className="section tinted"><div className="section-inner">
        <div className="section-heading"><div><div className="eyebrow">Belonging starts small</div><h2>Not more followers.<br/>More familiar faces.</h2></div><p className="section-intro">The best connections rarely begin with a perfect profile. They begin with a shared walk, a borrowed skill, or someone who remembers your name.</p></div>
        <div className="story-grid"><article className="story-card large"><div className="eyebrow">A thoughtful way to meet</div><div><h3>Connection without the performance.</h3><p>No swiping, popularity scores or pressure to post. Just thoughtful introductions and activities that make it easier to show up as yourself.</p></div></article>
          <article className="story-card"><div className="eyebrow">Around the corner</div><div><h3>Your neighbourhood is full of possibility.</h3><p>Meet people through interests, local communities and the things you already love doing.</p></div></article></div>
      </div></section>
      <section className="section"><div className="section-inner"><div className="section-heading"><div><div className="eyebrow">A gentle beginning</div><h2>Three small steps.<br/>A more connected week.</h2></div><p className="section-intro">You set the pace. Milaap makes the first hello feel a little more natural.</p></div>
        <div className="step-grid"><div className="step"><span className="step-num">01 — Make it yours</span><h3>Share what feels like you.</h3><p>A few interests, skills and ways you like to spend time are all it takes to get started.</p></div><div className="step"><span className="step-num">02 — Find common ground</span><h3>Meet through a shared thing.</h3><p>See thoughtful introductions with the reasons behind each suggestion, never a mystery score.</p></div><div className="step"><span className="step-num">03 — Take it offline</span><h3>Make a plan, together.</h3><p>Join a small activity, exchange a skill or help make your corner of the world better.</p></div></div>
      </div></section>
      <section className="quote-band"><blockquote>“Belonging is built in the little moments we make time for.”</blockquote><p>A more meaningful kind of community starts here.</p><Link href="/sign-up" className="button secondary" style={{marginTop:22}}>Come as you are <ArrowRight size={15}/></Link></section>
      <section className="section"><div className="section-inner section-heading"><div><div className="eyebrow">Built with care</div><h2>Good connection needs good boundaries.</h2></div><div><p className="section-intro">Your comfort matters. Explore our approach to privacy, respectful community and meeting safely in person.</p><Link href="/safety" className="text-link">Read about safety <ArrowRight size={14}/></Link></div></div></section>
    </main><Footer/>
  </div>;
}

const publicPages: Record<string,{title:string;eyebrow:string;lead:string;sections:[string,string][]}> = {
  '/how-it-works': {eyebrow:'A gentle beginning',title:'Connection, at your own pace.',lead:'Milaap helps people move from “we should meet sometime” to actually sharing a moment in real life.',sections:[['Start with what matters','Tell us a little about your interests, skills and the ways you like to spend time. You choose what to share and who can see it.'],['Find common ground','Discover people and communities through shared interests, nearby places and complementary skills. Suggestions explain why they may be a good fit.'],['Take the next small step','Send a thoughtful connection request, join an activity or start a skill exchange. Nothing asks you to be someone you are not.'],['Meet in a way that feels right','Choose a group activity, a public place and a pace that feels comfortable. Your boundaries are part of the plan.']]},
  '/social-impact': {eyebrow:'More connected places',title:'Belonging is a local thing.',lead:'When people know one another, everyday life has more room for care, exchange and shared purpose.',sections:[['Small moments, wider circles','A new neighbour becomes a familiar face. A student finds a patient mentor. A skill someone takes for granted becomes exactly what another person needs.'],['Connection across generations','Milaap makes room for people at different stages of life to meet through shared interests, practical help and group activities.'],['Community-led, not metric-led','We focus on meaningful offline connection rather than popularity scores. We do not claim impact through invented numbers; we build tools for communities to create their own.']]},
  '/safety': {eyebrow:'Care comes first',title:'Meet thoughtfully. Feel in control.',lead:'Good connections grow when people can set their own boundaries. A few practical choices can make an in-person hello feel more comfortable.',sections:[['You decide what to share','Profile visibility settings help you decide how much of your profile is visible. Keep personal details private until you are comfortable.'],['Start in a public place','For a first meeting, consider a familiar public location and let someone you trust know your plan. Group activities are a gentle way to meet.'],['Trust your instincts','You never owe someone a reply or a meeting. Block a person or report a concern if an interaction does not feel right.'],['Be kind, be clear','Respect a no, communicate boundaries and keep conversations welcoming. See our community guidelines for the shared expectations.']]},
  '/community-guidelines': {eyebrow:'A shared promise',title:'Make room for one another.',lead:'Milaap works best when people feel welcome, respected and free to show up as themselves.',sections:[['Lead with kindness','Speak to people with patience and respect. Remember there is a person on the other side of every message.'],['Respect boundaries','Consent matters in messages, introductions and activities. Accept a no gracefully and do not pressure someone to share more.'],['Keep it inclusive','Harassment, discrimination, hate speech and unwelcome conduct are not part of this community.'],['Help keep Milaap safe','Use report and block tools when needed. Please do not share another member’s personal information without permission.']]},
  '/privacy': {eyebrow:'Your information',title:'Privacy should feel understandable.',lead:'Your profile belongs to you. Share thoughtfully, use visibility settings and take a moment to review the choices available in your account.',sections:[['Profile visibility','You can choose whether your profile is visible to your community, members or private. Share only the details you are comfortable making visible.'],['Information you provide','Profile details, interests and activity preferences help Milaap support relevant introductions and community participation.'],['Your choices','You can update profile information and visibility preferences in settings. Use the account controls available to you to manage what you share.'],['Questions','If you have a privacy question, please contact the Milaap team through your community administrator.']]},
  '/terms': {eyebrow:'Using Milaap',title:'A few things we ask of everyone.',lead:'By using Milaap, you agree to participate in good faith, respect other members and use the platform for community connection.',sections:[['Use the platform respectfully','Do not use Milaap to harass, threaten, mislead or harm other people. Follow community guidelines and applicable laws.'],['Your account and contributions','Keep your account information accurate and take responsibility for the messages and content you share.'],['Community activity','Activities and introductions are organized by members. Use your judgment and make arrangements that feel safe and appropriate.'],['Updates','These terms may change as Milaap grows. The latest version will be available here.']]},
};
function PublicContent({page}: {page: typeof publicPages[string]}) {
  return <div className="app-shell"><PublicNav/><main className="content-page"><div className="eyebrow">{page.eyebrow}</div><h1>{page.title}</h1><p className="lead">{page.lead}</p>{page.sections.map(([heading,body])=><section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}<div style={{marginTop:36}}><Link href="/sign-up" className="button">Find your people <ArrowRight size={15}/></Link></div></main><Footer/></div>;
}

function NavGroup({items, path}:{items:typeof navPrimary;path:string}) {
  return <div className="side-nav">{items.map(({href,label,icon:Icon})=><Link key={href} href={href} className={path===href?'active':''} data-testid={`link-nav-${href.slice(1)}`}><Icon size={17}/>{label}</Link>)}</div>;
}
function AppShell({children}:{children:ReactNode}) {
  const [path] = useLocation(); const {user} = useUser(); const {signOut}=useClerk(); const [drawer,setDrawer]=useState(false);
  const title=[...navPrimary,...navCommunity,...navPersonal].find(item=>item.href===path)?.label ?? (path==='/onboarding'?'A little about you':'Your Milaap');
  return <div className="app-layout">
    <aside className="sidebar"><Brand/><div className="side-label">Your Milaap</div><NavGroup items={navPrimary} path={path}/><div className="side-label">Grow together</div><NavGroup items={navCommunity} path={path}/><div className="side-label">Your space</div><NavGroup items={navPersonal} path={path}/><div className="side-bottom"><button className="side-nav" style={{width:'100%',border:0,background:'transparent',textAlign:'left',cursor:'pointer'}} onClick={()=>signOut({redirectUrl:basePath||'/'})} data-testid="button-sign-out"><span style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',color:'#596252',fontSize:13,fontWeight:600}}><LogOut size={17}/>Sign out</span></button></div></aside>
    <div className="main-panel"><header className="topbar"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={()=>setDrawer(!drawer)} data-testid="button-mobile-menu">{drawer?<X size={19}/>:<Menu size={19}/>}</button><div className="topbar-title">{title}</div><div className="topbar-right"><Link href="/notifications" className="icon-button" aria-label="Notifications" data-testid="link-notifications"><Bell size={17}/></Link><Link href="/profile" className="avatar" aria-label="Your profile" data-testid="link-profile-avatar">{user?.firstName?.[0]??'M'}</Link></div></header>
      {drawer&&<div className="drawer-nav" style={{display:'block',padding:'15px 18px',background:'#eef1e5'}}><NavGroup items={navPrimary} path={path}/><NavGroup items={navCommunity} path={path}/><NavGroup items={navPersonal} path={path}/></div>}
      {children}
    </div>
  </div>;
}
function Heading({eyebrow,title,description,action}:{eyebrow:string;title:string;description:string;action?:ReactNode}) {
  return <div className="page-head"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
function Loading() { return <div className="stack" aria-label="Loading"><div className="loading-skeleton"/><div className="loading-skeleton"/><div className="loading-skeleton"/></div>; }
function QueryError({retry}:{retry:()=>void}) { return <div className="error-box" role="alert" data-testid="status-load-error">We couldn’t load this just now.<button className="button small ghost" onClick={retry} data-testid="button-retry">Try again</button></div>; }
function Empty({title,children}:{title:string;children:ReactNode}) { return <div className="empty" data-testid="state-empty"><strong>{title}</strong>{children}</div>; }
function FormInput({label,value,onChange,testId,placeholder,type='text'}:{label:string;value:string;onChange:(v:string)=>void;testId:string;placeholder?:string;type?:string}) {
  return <div className="field"><label htmlFor={testId}>{label}</label><input className="input" id={testId} data-testid={testId} type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></div>;
}

function DashboardPage() {
  const q=useGetDashboard(); const profile=useGetMyProfile();
  if(q.isLoading) return <main className="content"><Loading/></main>;
  if(q.isError) return <main className="content"><QueryError retry={()=>q.refetch()}/></main>;
  const data=q.data; const name=data?.profile?.displayName?.split(' ')[0]||profile.data?.displayName?.split(' ')[0]||'there';
  return <main className="content"><Heading eyebrow="A softer start to the day" title={`Good to see you, ${name}.`} description="A few thoughtful ways to feel more connected, right where you are."/>
    <div className="dashboard-grid"><div className="stack">
      <section className="panel"><div className="row"><div><div className="eyebrow">A good place to begin</div><h2 style={{fontSize:26,margin:'11px 0 5px'}}>People you might enjoy meeting</h2></div><Link href="/discover" className="text-link">Explore <ChevronRight size={14}/></Link></div>
        {(data?.suggestedPeople?.length??0)===0?<Empty title="Your next familiar face is out there">Add a few interests to your profile to help us find common ground.</Empty>:<div className="list">{data?.suggestedPeople?.slice(0,3).map(p=><div className="list-row" key={p.id} data-testid={`person-suggestion-${p.id}`}><div className="avatar">{p.displayName.slice(0,1)}</div><div className="row-body"><strong>{p.displayName}</strong>{p.id.startsWith('demo-')&&<span className="chip neutral" style={{marginLeft:8}}>Demo member</span>}<p>{p.reasons?.join(' · ')||p.bio||'A neighbour in your community'}</p></div><Link href="/discover" className="icon-button" aria-label={`See ${p.displayName}`}><ArrowRight size={16}/></Link></div>)}</div>}
      </section>
      <section className="panel"><div className="row"><div><div className="eyebrow">Make a little time</div><h2 style={{fontSize:26,margin:'11px 0 5px'}}>Coming together</h2></div><Link href="/activities" className="text-link">See activities <ChevronRight size={14}/></Link></div>
        {data?.upcomingActivities?.length?<div className="list">{data.upcomingActivities.slice(0,3).map(a=><div className="list-row" key={a.id} data-testid={`dashboard-activity-${a.id}`}><div className="icon-button"><CalendarDays size={17}/></div><div className="row-body"><strong>{a.title}</strong>{a.hostId.startsWith('demo-')&&<span className="chip neutral" style={{marginLeft:8}}>Demo activity</span>}<p>{a.communityName||a.category} · {a.scheduledAt?new Date(a.scheduledAt).toLocaleDateString():'Date to be arranged'}</p></div><span className="chip">{a.format==='group'?'Group':'One to one'}</span></div>)}</div>:<Empty title="A little room in your calendar">Browse activities and find something that feels like you.</Empty>}
      </section></div>
      <div className="stack"><section className="panel" style={{background:'#e9efcf'}}><div className="eyebrow">Your community</div><h2 style={{fontSize:27,margin:'12px 0'}}>Small things add up.</h2><p style={{color:'#59644b',fontSize:14,lineHeight:1.65}}>A shared interest can be the start of something good. Take a look around and find your next small step.</p><Link href="/communities" className="button small">Find a community <ArrowRight size={14}/></Link></section>
        <section className="panel"><div className="row"><div className="eyebrow">A note for you</div><Link href="/notifications" className="icon-button" aria-label="Notifications"><Bell size={16}/></Link></div>
          {data?.recentNotifications?.length?<div className="list">{data.recentNotifications.slice(0,3).map(n=><Link href={n.href||'/notifications'} key={n.id} className="list-row" style={{textDecoration:'none',color:'inherit'}} data-testid={`notification-${n.id}`}><span className={`chip ${n.isRead?'neutral':''}`}>{n.isRead?'Seen':'New'}</span><div className="row-body"><strong>{n.title}</strong><p>{n.description}</p></div></Link>)}</div>:<p className="status-line">When something needs your attention, you’ll find it here.</p>}
        </section><section className="panel"><div className="eyebrow">Something to share?</div><p style={{fontSize:14,color:'var(--muted-ink)',lineHeight:1.6}}>Offer a skill, ask for a hand or make a plan for the neighbourhood.</p><div className="tagline"><Link href="/skill-exchange" className="chip">Skill exchange</Link><Link href="/community-board" className="chip warm">Community board</Link></div></section></div></div>
  </main>;
}

function DiscoverPage() {
  const [search,setSearch]=useState(''); const qc=useQueryClient(); const params={search:search||undefined}; const q=useListPeople(params,{query:{queryKey:getListPeopleQueryKey(params)}});
  const create=useCreateConnection({mutation:{onSuccess:()=>{qc.invalidateQueries({queryKey:getListConnectionsQueryKey()});qc.invalidateQueries({queryKey:getListPeopleQueryKey()});}}});
  const report=useCreateReport(); const block=useBlockUser(); const [notice,setNotice]=useState('');
  return <main className="content"><Heading eyebrow="People nearby" title="Find your people." description="Shared interests are a lovely place to start. Every introduction shows why it might make sense."/>
    <div className="tool-row"><div className="search"><Search size={16}/><input className="input" placeholder="Search by name or interest" value={search} onChange={e=>setSearch(e.target.value)} data-testid="input-discover-search"/></div><span className="chip">Thoughtful introductions</span></div>
    {notice&&<div className="status-line" role="status" data-testid="status-discover">{notice}</div>}
    {q.isLoading?<Loading/>:q.isError?<QueryError retry={()=>q.refetch()}/>:q.data?.length?<div className="card-grid">{q.data.map(p=><article className="person-card" key={p.id} data-testid={`card-person-${p.id}`}><div className="person-top"><div className="avatar">{p.displayName.slice(0,1)}</div><div><h3>{p.displayName}</h3>{p.id.startsWith('demo-')&&<span className="chip neutral">Demo member</span>}<div className="status-line" style={{padding:'3px 0'}}><MapPin size={12}/> {p.locality||p.city||'Nearby'}</div></div></div><p>{p.bio||'A neighbour looking to make more room for community.'}</p><div className="tagline">{p.reasons?.slice(0,2).map(reason=><span className="chip" key={reason}>{reason}</span>)}</div><div className="person-foot"><button className="button small" disabled={create.isPending||!!p.connectionStatus} onClick={()=>create.mutate({data:{recipientId:p.id}}, {onSuccess:()=>setNotice(`A connection request was sent to ${p.displayName}.`),onError:()=>setNotice('We could not send that request. Please try again.')})} data-testid={`button-connect-${p.id}`}>{p.connectionStatus==='accepted'?'Connected':p.connectionStatus==='pending'?'Request sent':p.connectionStatus==='declined'?'Request declined':p.connectionStatus==='cancelled'?'Request closed':create.isPending?'Sending…':'Say hello'}</button><div style={{display:'flex',gap:6}}><button className="icon-button" title="Report member" aria-label={`Report ${p.displayName}`} onClick={()=>{const reason=window.prompt('What would you like us to know?');if(reason&&reason.trim().length>=3)report.mutate({data:{targetType:'user',targetId:p.id,reason}},{onSuccess:()=>setNotice('Thanks. Your report has been received.'),onError:()=>setNotice('We could not send your report.')});}} data-testid={`button-report-${p.id}`}><Flag size={15}/></button><button className="icon-button" title="Block member" aria-label={`Block ${p.displayName}`} onClick={()=>{if(window.confirm(`Block ${p.displayName}?`))block.mutate({id:p.id},{onSuccess:()=>{setNotice(`${p.displayName} has been blocked.`);qc.invalidateQueries({queryKey:getListPeopleQueryKey()});},onError:()=>setNotice('We could not block this member.')});}} data-testid={`button-block-${p.id}`}><UserRoundX size={15}/></button></div></div></article>)}</div>:<Empty title="No introductions just yet">Try another search, or add a few interests to your profile.</Empty>}
  </main>;
}

function ConnectionsPage() {
  const qc=useQueryClient();const q=useListConnections();const update=useUpdateConnection({mutation:{onSuccess:()=>qc.invalidateQueries({queryKey:getListConnectionsQueryKey()})}});const del=useDeleteConnection({mutation:{onSuccess:()=>qc.invalidateQueries({queryKey:getListConnectionsQueryKey()})}});
  return <main className="content"><Heading eyebrow="People you’ve met" title="Connections." description="A good connection can grow at its own pace."/>
    {(update.isError||del.isError)&&<div className="error-box" role="alert" data-testid="status-connection-error">That change could not be saved. Please try again.</div>}
    {q.isLoading?<Loading/>:q.isError?<QueryError retry={()=>q.refetch()}/>:q.data?.length?<div className="stack">{q.data.map(c=><article className="panel row" key={c.id} data-testid={`connection-${c.id}`}><div className="person-top"><div className="avatar">{c.otherDisplayName.slice(0,1)}</div><div><h3 style={{margin:0,fontSize:22}}>{c.otherDisplayName}</h3><p style={{margin:'5px 0',color:'var(--muted-ink)',fontSize:13}}>{c.otherBio||c.sharedInterests.join(' · ')||'Your community connection'}</p><span className={`chip ${c.status==='pending'?'warm':''}`}>{c.direction==='incoming'?'They reached out':c.direction==='outgoing'?'Request sent':'Connected'}</span></div></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{c.status==='pending'&&c.direction==='incoming'?<><button className="button small" disabled={update.isPending} onClick={()=>update.mutate({id:c.id,data:{status:'accepted'}})} data-testid={`button-accept-${c.id}`}>Accept</button><button className="button small ghost" disabled={update.isPending} onClick={()=>update.mutate({id:c.id,data:{status:'declined'}})} data-testid={`button-decline-${c.id}`}>Decline</button></>:c.status==='pending'?<button className="button small ghost" disabled={update.isPending} onClick={()=>update.mutate({id:c.id,data:{status:'cancelled'}})} data-testid={`button-cancel-${c.id}`}>Cancel request</button>:<button className="button small ghost" disabled={del.isPending} onClick={()=>{if(window.confirm(`Remove ${c.otherDisplayName} from your connections?`))del.mutate({id:c.id})}} data-testid={`button-remove-${c.id}`}>Remove</button>}</div></article>)}</div>:<Empty title="Your connections begin with a hello">Meet people around shared interests and take it one step at a time.<p><Link href="/discover" className="text-link">Explore people <ArrowRight size={14}/></Link></p></Empty>}
  </main>;
}

function ActivityForm({onClose}:{onClose:()=>void}) {
  const qc=useQueryClient();const create=useCreateActivity();const [title,setTitle]=useState('');const [description,setDescription]=useState('');const [category,setCategory]=useState('');const [date,setDate]=useState('');
  function submit(e:FormEvent){e.preventDefault();create.mutate({data:{title,description,category:category||'Community',durationMinutes:20,format:'group',capacity:8,scheduledAt:date?new Date(date).toISOString():null}},{onSuccess:()=>{qc.invalidateQueries({queryKey:getListActivitiesQueryKey()});onClose()},onError:()=>{}})}
  return <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="modal" onSubmit={submit}><div className="modal-head"><h2 style={{margin:0,fontSize:27}}>Make a plan together</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Close" data-testid="button-close-activity-form"><X size={17}/></button></div><div className="form-grid"><div className="full"><FormInput label="What would you like to do?" value={title} onChange={setTitle} testId="input-activity-title" placeholder="A neighbourhood garden afternoon"/></div><div className="full field"><label htmlFor="activity-description">A little more about it</label><textarea id="activity-description" className="textarea" value={description} onChange={e=>setDescription(e.target.value)} required minLength={5} data-testid="input-activity-description"/></div><FormInput label="Category" value={category} onChange={setCategory} testId="input-activity-category" placeholder="Outdoors, learning…"/><FormInput label="When (optional)" value={date} onChange={setDate} testId="input-activity-date" type="datetime-local"/></div>{create.isError&&<p className="error-box" role="alert">We couldn’t create this activity. Please check your details and try again.</p>}<div style={{display:'flex',justifyContent:'flex-end',gap:9,marginTop:18}}><button type="button" className="button ghost" onClick={onClose}>Not now</button><button className="button" disabled={create.isPending||title.trim().length<3||description.trim().length<5} data-testid="button-submit-activity">{create.isPending?'Creating…':'Create activity'}</button></div></form></div>;
}
type ActivityItem = Activity;

function ActivityActionButtons({
  activity,
  userId,
  pending,
  onAction,
}: {
  activity: ActivityItem;
  userId?: string;
  pending: boolean;
  onAction: (action: "request" | "confirm" | "cancel") => void;
}) {
  const isHost = activity.hostId === userId;
  const isParticipant =
    activity.participationStatus === "requested" ||
    activity.participationStatus === "confirmed";

  if (isHost) {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {activity.pendingRequestCount > 0 && (
          <button
            className="button small"
            disabled={pending || activity.status !== "open"}
            onClick={() => onAction("confirm")}
            data-testid={`button-confirm-activity-${activity.id}`}
          >
            {pending ? "Confirming…" : `Confirm request (${activity.pendingRequestCount})`}
          </button>
        )}
        <span className="chip neutral">You’re hosting</span>
        <button
          className="button small secondary"
          disabled={pending || activity.status !== "open"}
          onClick={() => {
            if (window.confirm("Cancel this activity? People who joined will be notified.")) {
              onAction("cancel");
            }
          }}
          data-testid={`button-cancel-activity-${activity.id}`}
        >
          Cancel activity
        </button>
      </span>
    );
  }

  if (isParticipant) {
    if (activity.status === "completed") {
      return <span className="chip neutral">Completed</span>;
    }
    const requestPending = activity.participationStatus === "requested";
    return (
      <button
        className="button small secondary"
        disabled={pending || activity.status !== "open"}
        onClick={() => {
          const prompt = requestPending
            ? "Withdraw your request to join this activity?"
            : "Leave this activity and free your place?";
          if (window.confirm(prompt)) onAction("cancel");
        }}
        data-testid={`button-leave-activity-${activity.id}`}
      >
        {pending ? "Leaving…" : requestPending ? "Withdraw request" : "Leave activity"}
      </button>
    );
  }

  return (
    <button
      className="button small"
      disabled={
        pending ||
        !userId ||
        activity.status !== "open" ||
        (activity.format === "one-to-one" && activity.participantCount > 0)
      }
      onClick={() => onAction("request")}
      data-testid={`button-join-activity-${activity.id}`}
    >
      {activity.format === "one-to-one" && activity.participantCount > 0
        ? "Full"
        : pending
          ? "Joining…"
          : "Join in"}
    </button>
  );
}

function ActivitiesPage() {
  const qc=useQueryClient();const q=useListActivities();const profile=useGetMyProfile();const join=useJoinActivity({mutation:{onSuccess:()=>qc.invalidateQueries({queryKey:getListActivitiesQueryKey()})}});const [form,setForm]=useState(false);const [selected,setSelected]=useState<string|undefined>();
  const detail=useGetActivity(selected||'',{query:{enabled:!!selected,queryKey:getGetActivityQueryKey(selected||'')}});
  return <main className="content"><Heading eyebrow="Out in the world" title="Things to do, together." description="Small, welcoming activities are an easy way to meet through something you enjoy." action={<button className="button" onClick={()=>setForm(true)} data-testid="button-create-activity"><Plus size={16}/>Host an activity</button>}/>
    {join.isError&&<div className="error-box" role="alert" data-testid="status-activity-error">We couldn’t update your place. Please try again.</div>}
    {q.isLoading?<Loading/>:q.isError?<QueryError retry={()=>q.refetch()}/>:q.data?.length?<div className="card-grid">{q.data.map(a=><article className="activity-card" key={a.id} data-testid={`card-activity-${a.id}`}><div className="row"><span className="chip">{a.category}</span><span className="chip neutral">{a.format==='group'?'Group':'One to one'}</span>{a.hostId.startsWith('demo-')&&<span className="chip neutral">Demo activity</span>}</div><h3 style={{marginTop:17}}>{a.title}</h3><p>{a.description}</p><div className="list-row" style={{padding:'8px 0 14px'}}><CalendarDays size={15}/><div className="row-body"><strong>{a.scheduledAt?new Date(a.scheduledAt).toLocaleString():'Time to be arranged'}</strong><p>{a.meetingPoint||a.communityName||'Community gathering'}</p></div></div><div className="activity-foot"><span className="status-line">{a.participantCount} of {a.capacity} places</span><ActivityActionButtons activity={a} userId={profile.data?.id} pending={join.isPending} onAction={action=>join.mutate({id:a.id,data:{action}})}/></div><button className="text-link" onClick={()=>setSelected(a.id)} style={{marginTop:12,border:0,background:'transparent',textAlign:'left',cursor:'pointer'}} data-testid={`button-activity-details-${a.id}`}>Activity details <ChevronRight size={14}/></button></article>)}</div>:<Empty title="No activities here yet">Be the first to make a simple plan for your community.</Empty>}
    {selected&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(undefined)}}><div className="modal" role="dialog" aria-modal="true" aria-label="Activity details"><div className="modal-head"><h2 style={{fontSize:28,margin:0}}>A little more detail</h2><button className="icon-button" onClick={()=>setSelected(undefined)} aria-label="Close activity details"><X size={17}/></button></div>{detail.isLoading?<Loading/>:detail.isError?<QueryError retry={()=>detail.refetch()}/>:detail.data&&<div data-testid={`activity-detail-${detail.data.id}`}><h3>{detail.data.title}</h3><p>{detail.data.description}</p><p><strong>Meeting point:</strong> {detail.data.meetingPoint||'Shared with participants'}</p><p><strong>Accessibility:</strong> {detail.data.accessibility||'Ask the host for details'}</p><p><strong>What to bring:</strong> {detail.data.materials||'Nothing specific'}</p></div>}</div></div>}
    {form&&<ActivityForm onClose={()=>setForm(false)}/>}
  </main>;
}

function SkillForm({onDone}:{onDone:()=>void}) {
  const qc=useQueryClient();const create=useCreateSkill();const [skill,setSkill]=useState('');const [type,setType]=useState<'offer'|'request'>('offer');const [description,setDescription]=useState('');
  return <form className="panel" onSubmit={e=>{e.preventDefault();create.mutate({data:{skill,type,description,experienceLevel:'Comfortable',format:'In person',availability:'Flexible'}},{onSuccess:()=>{qc.invalidateQueries({queryKey:getListSkillsQueryKey()});setSkill('');setDescription('');onDone()},onError:()=>{}})}}><div className="eyebrow">Make an exchange</div><h2 style={{fontSize:25,margin:'9px 0 16px'}}>Something you can share?</h2><div className="form-grid"><FormInput label="Skill or learning goal" value={skill} onChange={setSkill} testId="input-skill-name" placeholder="Bread making, language practice…"/><div className="field"><label htmlFor="skill-type">I would like to</label><select id="skill-type" className="select" value={type} onChange={e=>setType(e.target.value as 'offer'|'request')} data-testid="select-skill-type"><option value="offer">Offer a skill</option><option value="request">Learn a skill</option></select></div><div className="full field"><label htmlFor="skill-description">A few details</label><textarea className="textarea" id="skill-description" value={description} onChange={e=>setDescription(e.target.value)} data-testid="input-skill-description"/></div></div>{create.isError&&<p className="error-box">We couldn’t save this listing. Try again.</p>}<button className="button small" style={{marginTop:13}} disabled={create.isPending||skill.trim().length<2} data-testid="button-submit-skill">{create.isPending?'Saving…':'Share this'}</button></form>;
}
function SkillsPage() {
  const qc=useQueryClient();const q=useListSkills();const profile=useGetMyProfile();const update=useUpdateSkill();const del=useDeleteSkill();const [search,setSearch]=useState('');const [type,setType]=useState('');
  const mine=q.data?.filter(s=>s.userId===profile.data?.id)||[];
  return <main className="content"><Heading eyebrow="Give a little, learn a little" title="Skill exchange." description="A generous place for the things you know and the things you’re curious about."/>
    {(update.isError||del.isError)&&<div className="error-box" role="alert" data-testid="status-skill-error">We couldn’t update that listing. Please try again.</div>}
    <SkillForm onDone={()=>{}}/>
    <section style={{marginTop:24}}><div className="tool-row"><div className="search"><Search size={16}/><input className="input" placeholder="Find a skill" value={search} onChange={e=>setSearch(e.target.value)} data-testid="input-skill-search"/></div><div className="toolbar-tabs"><button className={`tab ${type===''?'active':''}`} onClick={()=>setType('')}>Everything</button><button className={`tab ${type==='offer'?'active':''}`} onClick={()=>setType('offer')}>Offers</button><button className={`tab ${type==='request'?'active':''}`} onClick={()=>setType('request')}>Learning requests</button></div></div>
    {q.isLoading?<Loading/>:q.isError?<QueryError retry={()=>q.refetch()}/>:q.data?.filter(s=>(!type||s.type===type)&&(!search||s.skill.toLowerCase().includes(search.toLowerCase()))).length?<div className="card-grid">{q.data.filter(s=>(!type||s.type===type)&&(!search||s.skill.toLowerCase().includes(search.toLowerCase()))).map(s=><article className="panel" key={s.id} data-testid={`skill-listing-${s.id}`}><div className="row"><span className={`chip ${s.type==='request'?'warm':''}`}>{s.type==='offer'?'Offering':'Hoping to learn'}</span>{s.userId.startsWith('demo-')&&<span className="chip neutral">Demo listing</span>}</div><h3 style={{fontSize:24,margin:'14px 0 5px'}}>{s.skill}</h3><p className="status-line">{s.description||'A skill shared with the community.'}</p><div className="row"><span className="status-line">{s.displayName} · {s.availability}</span>{mine.some(m=>m.id===s.id)&&<span style={{display:'flex',gap:5}}><button className="icon-button" aria-label={`Update ${s.skill}`} title="Update listing" onClick={()=>{const value=window.prompt('Update your listing description',s.description);if(value!==null)update.mutate({id:s.id,data:{description:value}},{onSuccess:()=>qc.invalidateQueries({queryKey:getListSkillsQueryKey()})})}} data-testid={`button-edit-skill-${s.id}`}><Settings size={14}/></button><button className="icon-button" aria-label={`Delete ${s.skill}`} title="Delete listing" onClick={()=>{if(window.confirm('Delete this skill listing?'))del.mutate({id:s.id},{onSuccess:()=>qc.invalidateQueries({queryKey:getListSkillsQueryKey()})})}} data-testid={`button-delete-skill-${s.id}`}><X size={14}/></button></span>}</div></article>)}</div>:<Empty title="A new exchange starts with one skill">Share something you know or something you would love to learn.</Empty>}
    </section>
  </main>;
}

function ProjectForm() {
  const qc=useQueryClient();const create=useCreateProject();const [title,setTitle]=useState('');const [description,setDescription]=useState('');const [category,setCategory]=useState('');
  return <form className="panel" onSubmit={e=>{e.preventDefault();create.mutate({data:{title,description,category:category||'Community'}},{onSuccess:()=>{qc.invalidateQueries({queryKey:getListProjectsQueryKey()});setTitle('');setDescription('')},onError:()=>{}})}}><div className="eyebrow">A good idea has room to grow</div><h2 style={{fontSize:25,margin:'9px 0 16px'}}>Put a project in motion</h2><div className="form-grid"><FormInput label="Project idea" value={title} onChange={setTitle} testId="input-project-title" placeholder="A shared seed library"/><FormInput label="Category" value={category} onChange={setCategory} testId="input-project-category" placeholder="Neighbourhood, access…"/><div className="full field"><label htmlFor="project-description">What would you like to make happen?</label><textarea id="project-description" className="textarea" value={description} onChange={e=>setDescription(e.target.value)} required minLength={5} data-testid="input-project-description"/></div></div>{create.isError&&<p className="error-box">We couldn’t add this idea. Please try again.</p>}<button className="button small" style={{marginTop:13}} disabled={create.isPending||title.trim().length<3||description.trim().length<5} data-testid="button-submit-project">{create.isPending?'Sharing…':'Share the idea'}</button></form>;
}
function ProjectsPage() {
  const qc=useQueryClient();const q=useListProjects();const join=useJoinProject({mutation:{onSuccess:()=>qc.invalidateQueries({queryKey:getListProjectsQueryKey()})}});const [search,setSearch]=useState('');
  const results=q.data?.filter(p=>!search||p.title.toLowerCase().includes(search.toLowerCase())||p.category.toLowerCase().includes(search.toLowerCase()));
  return <main className="content"><Heading eyebrow="A better place, together" title="Community board." description="Local ideas become real when people bring what they can."/>
    {join.isError&&<div className="error-box" role="alert" data-testid="status-project-error">We couldn’t add you to the project. Please try again.</div>}
    <ProjectForm/><div className="tool-row" style={{marginTop:24}}><div className="search"><Search size={16}/><input className="input" placeholder="Search projects" value={search} onChange={e=>setSearch(e.target.value)} data-testid="input-project-search"/></div></div>
    {q.isLoading?<Loading/>:q.isError?<QueryError retry={()=>q.refetch()}/>:results?.length?<div className="card-grid">{results.map(p=><article className="panel" key={p.id} data-testid={`project-${p.id}`}><div className="row"><span className="chip">{p.category}</span><span className="chip neutral">{p.status.replace('-',' ')}</span>{p.ownerId.startsWith('demo-')&&<span className="chip neutral">Demo project</span>}</div><h3 style={{fontSize:25,margin:'15px 0 6px'}}>{p.title}</h3><p className="status-line">{p.description}</p><div className="row" style={{marginTop:14}}><span className="status-line">{p.volunteerCount} {p.volunteerCount===1?'person':'people'} involved</span><button className={`button small ${p.joined?'secondary':''}`} disabled={p.joined||join.isPending} onClick={()=>join.mutate({id:p.id})} data-testid={`button-join-project-${p.id}`}>{p.joined?'You’re helping':join.isPending?'Joining…':'I can help'}</button></div></article>)}</div>:<Empty title="No shared projects just yet">Have a small idea that could make your community better? Add it above.</Empty>}
  </main>;
}

function CommunitiesPage() {
  const qc=useQueryClient();const q=useListCommunities();const join=useJoinCommunity({mutation:{onSuccess:()=>qc.invalidateQueries({queryKey:getListCommunitiesQueryKey()})}});const [search,setSearch]=useState('');
  const data=q.data?.filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase())||c.description.toLowerCase().includes(search.toLowerCase()));
  return <main className="content"><Heading eyebrow="Find your corner" title="Communities." description="A place to share a local interest, lend a hand and see familiar faces."/>
    {join.isError&&<div className="error-box" role="alert" data-testid="status-community-error">We couldn’t send your join request. Please try again.</div>}
    <div className="tool-row"><div className="search"><Search size={16}/><input className="input" placeholder="Search communities" value={search} onChange={e=>setSearch(e.target.value)} data-testid="input-community-search"/></div></div>
    {q.isLoading?<Loading/>:q.isError?<QueryError retry={()=>q.refetch()}/>:data?.length?<div className="card-grid">{data.map(c=><article className="panel" key={c.id} data-testid={`community-${c.id}`}><div className="row"><span className="chip">{c.type}</span><span className="status-line"><Users size={14}/> {c.memberCount} members</span></div><h3 style={{fontSize:25,margin:'15px 0 6px'}}>{c.name}</h3><p className="status-line">{c.description}</p><p className="status-line"><MapPin size={14}/> {c.city||'Local community'}</p><div className="row" style={{marginTop:14}}><button className="text-link" onClick={()=>window.alert(c.guidelines||'Please be kind and welcoming to every member.')} data-testid={`button-guidelines-${c.id}`}>Guidelines</button><button className={`button small ${c.membershipStatus?'secondary':''}`} disabled={!!c.membershipStatus||join.isPending} onClick={()=>join.mutate({id:c.id})} data-testid={`button-join-community-${c.id}`}>{c.membershipStatus||'Join community'}</button></div></article>)}</div>:<Empty title="No communities found">Try a different search term.</Empty>}
  </main>;
}

function NotificationsPage() {
  const qc=useQueryClient();const q=useListNotifications();const mark=useMarkAllNotificationsRead({mutation:{onSuccess:()=>qc.invalidateQueries({queryKey:getListNotificationsQueryKey()})}});
  return <main className="content"><Heading eyebrow="A little update" title="Notifications." description="Requests, replies and activity updates, all in one place." action={<button className="button small secondary" onClick={()=>mark.mutate(undefined,{onError:()=>{}})} disabled={mark.isPending||!q.data?.some(n=>!n.isRead)} data-testid="button-mark-all-read">{mark.isPending?'Updating…':'Mark all as read'}</button>}/>
    {mark.isError&&<div className="error-box" role="alert" data-testid="status-notification-error">We couldn’t update notifications. Please try again.</div>}
    {q.isLoading?<Loading/>:q.isError?<QueryError retry={()=>q.refetch()}/>:q.data?.length?<div className="panel list">{q.data.map(n=><Link href={n.href||'/notifications'} className="list-row" key={n.id} style={{textDecoration:'none',color:'inherit'}} data-testid={`notification-item-${n.id}`}><span className={`chip ${n.isRead?'neutral':''}`}>{n.isRead?'Read':'New'}</span><div className="row-body"><strong>{n.title}</strong><p>{n.description}</p><span className="status-line">{new Date(n.createdAt).toLocaleString()}</span></div>{!n.isRead&&<span className="avatar" style={{width:10,height:10}}/>}</Link>)}</div>:<Empty title="A quiet moment">You’re all caught up. New updates will appear here.</Empty>}
  </main>;
}

function MessagesPage() {
  const qc=useQueryClient();const conversations=useListConversations();const [active,setActive]=useState('');const conversationId=active||conversations.data?.[0]?.id||'';
  const messages=useListMessages(conversationId,{query:{enabled:!!conversationId,queryKey:getListMessagesQueryKey(conversationId)}});
  const send=useSendMessage();const [body,setBody]=useState('');
  return <main className="content"><Heading eyebrow="A thoughtful hello" title="Messages." description="Take your time. Good conversations don’t need to be rushed."/>
    <div className="panel message-layout" data-testid="messages-interface"><div className="conversation-list"><div className="eyebrow" style={{padding:'3px 10px 9px'}}>Conversations</div>{conversations.isLoading?<div className="loading-skeleton"/>:conversations.isError?<QueryError retry={()=>conversations.refetch()}/>:conversations.data?.length?conversations.data.map(c=><button className={`conversation ${conversationId===c.id?'active':''}`} key={c.id} onClick={()=>setActive(c.id)} data-testid={`button-conversation-${c.id}`}><div className="avatar">{c.otherDisplayName.slice(0,1)}</div><div className="row-body"><strong>{c.otherDisplayName}</strong><p>{c.lastMessage||'Start a conversation'}</p></div>{c.unreadCount>0&&<span className="chip">{c.unreadCount}</span>}</button>):<Empty title="No conversations yet">When you connect with someone, your conversation will live here.</Empty>}</div>
      <section className="chat">{conversationId?<><div className="chat-history" aria-live="polite">{messages.isLoading?<div className="loading-skeleton"/>:messages.isError?<QueryError retry={()=>messages.refetch()}/>:messages.data?.length?messages.data.map(m=><div className={`bubble ${m.senderId===conversations.data?.find(c=>c.id===conversationId)?.otherUserId?'':'mine'}`} key={m.id} data-testid={`message-${m.id}`}><span>{m.body}</span><div style={{fontSize:10,opacity:.65,marginTop:5}}>{m.senderName} · {new Date(m.createdAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</div></div>):<Empty title="A fresh conversation">Say hello when you’re ready.</Empty>}</div><form className="chat-form" onSubmit={e=>{e.preventDefault();if(!body.trim())return;send.mutate({id:conversationId,data:{body:body.trim()}},{onSuccess:()=>{setBody('');qc.invalidateQueries({queryKey:getListMessagesQueryKey(conversationId)});qc.invalidateQueries({queryKey:getListConversationsQueryKey()})},onError:()=>{}})}}><input className="input" value={body} onChange={e=>setBody(e.target.value)} placeholder="Write a kind hello…" aria-label="Message" data-testid="input-message"/><button className="button small" disabled={send.isPending||!body.trim()} data-testid="button-send-message"><Send size={15}/>{send.isPending?'Sending…':'Send'}</button></form>{send.isError&&<p className="error-box">Message not sent. Please try again.</p>}</>:<div className="empty" style={{margin:'auto'}}>Choose a conversation to begin.</div>}</section>
    </div>
  </main>;
}

function ProfilePage({onboarding=false}:{onboarding?:boolean}) {
  const qc=useQueryClient();const q=useGetMyProfile();const update=useUpdateMyProfile();const [name,setName]=useState('');const [bio,setBio]=useState('');const [city,setCity]=useState('');const [interests,setInterests]=useState('');
  useEffect(()=>{if(q.data){setName(q.data.displayName);setBio(q.data.bio||'');setCity(q.data.city||'');setInterests(q.data.interests.join(', '));}},[q.data?.id]);
  if(q.isLoading)return <main className="content"><Loading/></main>;
  if(q.isError)return <main className="content"><QueryError retry={()=>q.refetch()}/></main>;
  const save=(e:FormEvent)=>{e.preventDefault();update.mutate({data:{displayName:name,bio,city,interests:interests.split(',').map(v=>v.trim()).filter(Boolean),onboardingComplete:true}},{onSuccess:()=>{qc.invalidateQueries({queryKey:getGetMyProfileQueryKey()});qc.invalidateQueries({queryKey:getGetDashboardQueryKey()})},onError:()=>{}})};
  return <main className="content"><Heading eyebrow={onboarding?'A little introduction':'Your story'} title={onboarding?'Let’s make this yours.':'Your profile.'} description={onboarding?'Share only what feels comfortable. You can always come back and change it.':'A few details help your community find common ground with you.'}/>
    <form className="panel" onSubmit={save} style={{maxWidth:780}}><div className="form-grid"><FormInput label="What should we call you?" value={name} onChange={setName} testId="input-profile-name"/><FormInput label="City or town" value={city} onChange={setCity} testId="input-profile-city" placeholder="Where you call home"/><div className="full field"><label htmlFor="profile-bio">A little about you</label><textarea className="textarea" maxLength={500} id="profile-bio" value={bio} onChange={e=>setBio(e.target.value)} placeholder="What do you enjoy, or hope to find here?" data-testid="input-profile-bio"/></div><div className="full field"><label htmlFor="profile-interests">Interests <span style={{fontWeight:400,color:'var(--muted-ink)'}}>Separate with commas</span></label><input className="input" id="profile-interests" value={interests} onChange={e=>setInterests(e.target.value)} placeholder="Walking, cooking, local history…" data-testid="input-profile-interests"/></div><div className="field"><label htmlFor="visibility">Profile visibility</label><select className="select" id="visibility" defaultValue={q.data?.profileVisibility||'community'} onChange={e=>update.mutate({data:{profileVisibility:e.target.value as 'community'|'members'|'private'}},{onSuccess:()=>qc.invalidateQueries({queryKey:getGetMyProfileQueryKey()})})} data-testid="select-profile-visibility"><option value="community">My community</option><option value="members">Milaap members</option><option value="private">Private</option></select></div><label className="row" style={{justifyContent:'flex-start',alignSelf:'end',fontSize:13,gap:9}}><input type="checkbox" defaultChecked={q.data?.groupActivities??true} onChange={e=>update.mutate({data:{groupActivities:e.target.checked}},{onSuccess:()=>qc.invalidateQueries({queryKey:getGetMyProfileQueryKey()})})} data-testid="checkbox-group-activities"/>I’m open to group activities</label></div>{update.isError&&<p className="error-box" style={{marginTop:14}} role="alert">We couldn’t save your changes. Please try again.</p>}{update.isSuccess&&<p className="status-line" role="status" data-testid="status-profile-saved">Your profile has been saved.</p>}<div className="row" style={{marginTop:18}}><span className="status-line">Your information is yours to update.</span><button className="button" disabled={update.isPending||!name.trim()} data-testid="button-save-profile">{update.isPending?'Saving…':onboarding?'Save and continue':'Save changes'}</button></div></form>
  </main>;
}
function SettingsPage() {
  const q=useGetMyProfile();const qc=useQueryClient();const update=useUpdateMyProfile();
  return <main className="content"><Heading eyebrow="Your preferences" title="Settings." description="Choose what feels comfortable for your profile and community experience."/>
    {q.isLoading?<Loading/>:q.isError?<QueryError retry={()=>q.refetch()}/>:<div className="stack" style={{maxWidth:800}}><section className="panel"><div className="eyebrow"><LockKeyhole size={14}/> Profile privacy</div><h2 style={{fontSize:25}}>Who can see your profile?</h2><select className="select" value={q.data?.profileVisibility||'community'} onChange={e=>update.mutate({data:{profileVisibility:e.target.value as 'community'|'members'|'private'}},{onSuccess:()=>qc.invalidateQueries({queryKey:getGetMyProfileQueryKey()})})} data-testid="select-settings-visibility"><option value="community">People in my community</option><option value="members">Milaap members</option><option value="private">Keep my profile private</option></select><p className="status-line">Visibility settings help you choose how much you share.</p></section><section className="panel"><div className="eyebrow">How you connect</div><h2 style={{fontSize:25}}>Activities that feel right</h2><label style={{display:'flex',gap:10,alignItems:'center',fontSize:14}}><input type="checkbox" checked={q.data?.groupActivities??false} onChange={e=>update.mutate({data:{groupActivities:e.target.checked}},{onSuccess:()=>qc.invalidateQueries({queryKey:getGetMyProfileQueryKey()})})} data-testid="checkbox-settings-group"/>I’m open to group activities</label></section>{update.isPending&&<p className="status-line" role="status">Saving your preference…</p>}{update.isError&&<div className="error-box" role="alert">We couldn’t save this setting. Try again.</div>}{update.isSuccess&&<p className="status-line" role="status" data-testid="status-settings-saved">Preference saved.</p>}<section className="panel"><div className="eyebrow"><Shield size={14}/> Safety and support</div><h2 style={{fontSize:25}}>You’re in control</h2><p className="status-line">Read about community care, or reach out if something does not feel right.</p><div className="row" style={{justifyContent:'flex-start'}}><Link href="/safety" className="button small secondary">Safety at Milaap</Link><Link href="/community-guidelines" className="button small ghost">Community guidelines</Link></div></section></div>}
  </main>;
}

function ProfileRoute() { return <ProfilePage/>; }
function Protected({children}:{children:ReactNode}) { return <><Show when="signed-in">{children}</Show><Show when="signed-out"><Redirect to="/"/></Show></>; }
function ProtectedPage({children}:{children:ReactNode}) { return <Protected><AppShell>{children}</AppShell></Protected>; }
function HomeRedirect() { return <><Show when="signed-in"><Redirect to="/dashboard"/></Show><Show when="signed-out"><HomePage/></Show></>; }
function PublicRoute({path}:{path:string}) { return <PublicContent page={publicPages[path]}/>; }
function SignInPage() { return <div className="app-shell" style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:20,background:'radial-gradient(ellipse at 15% 15%, #e9efcf 0, #f7f8f3 48%, #eff0e6 100%)'}}><div style={{position:'absolute',top:24,left:28}}><Brand/></div><div style={{textAlign:'center',marginBottom:20}}><p className="eyebrow" style={{justifyContent:'center'}}>A place to belong</p></div><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}/></div>; }
function SignUpPage() { return <div className="app-shell" style={{minHeight:'100dvh',display:'grid',placeItems:'center',padding:20,background:'radial-gradient(ellipse at 15% 15%, #e9efcf 0, #f7f8f3 48%, #eff0e6 100%)'}}><div style={{position:'absolute',top:24,left:28}}><Brand/></div><div style={{textAlign:'center',marginBottom:20}}><p className="eyebrow" style={{justifyContent:'center'}}>Your next hello starts here</p></div><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`}/></div>; }
function ClerkCacheInvalidator() {
  const {addListener}=useClerk();const qc=useQueryClient();
  useEffect(()=>{let previous:string|null|undefined;const unsubscribe=addListener(({user})=>{const id=user?.id??null;if(previous!==undefined&&previous!==id)qc.clear();previous=id;});return unsubscribe;},[addListener,qc]);
  return null;
}
function ClerkRouter() {
  const [,setLocation]=useLocation();
  if(!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={{
    theme:shadcn,cssLayerName:'clerk',
    options:{logoPlacement:'inside',logoLinkUrl:basePath||'/',logoImageUrl:`${window.location.origin}${basePath}/logo.svg`},
    variables:{colorPrimary:'#7B8F42',colorForeground:'#20241F',colorMutedForeground:'#687066',colorDanger:'#A3473E',colorBackground:'#FBFCF8',colorInput:'#FFFFFF',colorInputForeground:'#20241F',colorNeutral:'#DCE1D3',fontFamily:'DM Sans, sans-serif',borderRadius:'1rem'},
    elements:{rootBox:'w-full flex justify-center',cardBox:'bg-[#fbfcf8] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#e3e6da] shadow-xl',card:'!shadow-none !border-0 !bg-transparent !rounded-none',footer:'!shadow-none !border-0 !bg-transparent !rounded-none',headerTitle:'text-[#20241f] font-semibold',headerSubtitle:'text-[#687066]',socialButtonsBlockButtonText:'text-[#20241f] font-semibold',formFieldLabel:'text-[#40483a] font-semibold',footerActionLink:'text-[#617437] font-semibold',footerActionText:'text-[#687066]',dividerText:'text-[#687066]',identityPreviewEditButton:'text-[#617437]',formFieldSuccessText:'text-[#526137]',alertText:'text-[#873e35]',logoBox:'rounded-xl',logoImage:'object-contain',socialButtonsBlockButton:'border-[#dce1d3] bg-[#fff] rounded-xl',formButtonPrimary:'bg-[#7b8f42] hover:bg-[#687a34] rounded-xl text-white',formFieldInput:'bg-white border-[#dce1d3] rounded-xl text-[#20241f]',footerAction:'text-[#687066]',dividerLine:'bg-[#dce1d3]',alert:'bg-[#fcf0ed] border-[#e4c4bd]',otpCodeFieldInput:'bg-white border-[#dce1d3] rounded-lg',formFieldRow:'gap-2',main:'gap-4'}
  }} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{
    signIn:{start:{title:'Welcome back',subtitle:'Your community is right here.'}},
    signUp:{start:{title:'Come as you are',subtitle:'Start with a small hello.'}}
  }} routerPush={to=>setLocation(stripBase(to))} routerReplace={to=>setLocation(stripBase(to),{replace:true})}>
    <QueryClientProvider client={queryClient}><ClerkCacheInvalidator/><Switch>
      <Route path="/" component={HomeRedirect}/>
      <Route path="/sign-in/*?" component={SignInPage}/><Route path="/sign-up/*?" component={SignUpPage}/>
      <Route path="/how-it-works"><PublicRoute path="/how-it-works"/></Route><Route path="/social-impact"><PublicRoute path="/social-impact"/></Route><Route path="/safety"><PublicRoute path="/safety"/></Route><Route path="/community-guidelines"><PublicRoute path="/community-guidelines"/></Route><Route path="/privacy"><PublicRoute path="/privacy"/></Route><Route path="/terms"><PublicRoute path="/terms"/></Route>
      <Route path="/onboarding"><ProtectedPage><ProfilePage onboarding/></ProtectedPage></Route>
      <Route path="/dashboard"><ProtectedPage><DashboardPage/></ProtectedPage></Route><Route path="/discover"><ProtectedPage><DiscoverPage/></ProtectedPage></Route><Route path="/connections"><ProtectedPage><ConnectionsPage/></ProtectedPage></Route><Route path="/activities"><ProtectedPage><ActivitiesPage/></ProtectedPage></Route><Route path="/skill-exchange"><ProtectedPage><SkillsPage/></ProtectedPage></Route><Route path="/community-board"><ProtectedPage><ProjectsPage/></ProtectedPage></Route><Route path="/communities"><ProtectedPage><CommunitiesPage/></ProtectedPage></Route><Route path="/messages"><ProtectedPage><MessagesPage/></ProtectedPage></Route><Route path="/notifications"><ProtectedPage><NotificationsPage/></ProtectedPage></Route><Route path="/profile"><ProtectedPage><ProfileRoute/></ProtectedPage></Route><Route path="/settings"><ProtectedPage><SettingsPage/></ProtectedPage></Route>
      <Route component={NotFound}/>
    </Switch></QueryClientProvider>
  </ClerkProvider>;
}
function App() {
  return <WouterRouter base={basePath}><ClerkRouter/></WouterRouter>;
}
export default App;
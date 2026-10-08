import {Notifications,NotificationPost} from '../modules/notifications/index.js';
import { Routes,Route,Navigate,useLocation } from 'react-router-dom';
import { Messages } from '../modules/messages/index.js';
import FeedNavigation from './layout/FeedNavigation.jsx';
import { Connections } from '../modules/connections/index.js';
import { Home } from '../modules/feed/index.js';
import { Profile } from '../modules/profiles/index.js';
import { CreatePost } from '../modules/posts/index.js';
export default function SignedInRoutes({auth}){const {pathname}=useLocation();const {session,handleLogout,loggingOut,logoutError,updateUser}=auth;return <><FeedNavigation session={session} onLogout={handleLogout} loggingOut={loggingOut} logoutError={logoutError}/><Routes>
 <Route path="/" element={<Home session={session} onLogout={handleLogout} loggingOut={loggingOut} logoutError={logoutError}/>}/>
 <Route path="/notifications" element={<Notifications key={session.token} session={session}/>}/><Route path="/notifications/posts/:post_id" element={<NotificationPost key={pathname} session={session}/>}/><Route path="/messages" element={<Messages session={session}/>}/><Route path="/connections" element={<Connections session={session}/>}/><Route path="/create" element={<CreatePost session={session}/>}/>
 <Route path="/profiles/:username" element={<Profile key={pathname} session={session} onUpdated={updateUser}/>}/><Route path="*" element={<Navigate to="/" replace/>}/>
 </Routes></>;}

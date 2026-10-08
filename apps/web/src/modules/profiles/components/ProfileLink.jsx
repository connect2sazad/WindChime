import { Link } from 'react-router-dom';
export default function ProfileLink({username,children,...props}){
 if(!username)return <span {...props}>{children}</span>;
 return <Link {...props} to={`/profiles/${encodeURIComponent(username)}`}>{children}</Link>;
}

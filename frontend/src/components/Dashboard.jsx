import Sidebar from './Sidebar';
import Chat from './Chat';

export default function Dashboard({ onLogout, username }) {
  return (
    <div className="dashboard-layout animate-fade-in">
      <Sidebar onLogout={onLogout} username={username} />
      <Chat />
    </div>
  );
}

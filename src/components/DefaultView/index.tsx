import { useState } from 'react';
import { NavbarSimple } from '../NavBar';
import Recorder from '../Recorder';
import Settings from '../Settings';
import Home from '../Home';

interface DefaultViewProps {
  userInfo: { name: string; file_dir: string } | null;
}

export default function DefaultView({ userInfo }: DefaultViewProps) {
  const [activePage, setActivePage] = useState('Home');

  const handlePageChange = (page: string) => {
    setActivePage(page);
  };

  return (
    <div className="main-layout">
      <NavbarSimple activePage={activePage} onPageChange={handlePageChange} />
      <div className="default-view">
        {activePage === 'Home' && <Home userName={userInfo?.name} />}
        {activePage === 'Recorder' && <Recorder />}
        {activePage === 'Settings' && <Settings />}
      </div>
    </div>
  );
}

export { DefaultView };

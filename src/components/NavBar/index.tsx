import { useState } from 'react';
import {
  IconHome,
  IconPlayerRecord,
  IconBulb,
  IconHistory,
  IconSettings,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import { Group, NavLink, Button} from '@mantine/core';
import './navbar.css';

const data = [
  { link: '', label: 'Home', icon: IconHome },
  { link: '', label: 'Insights', icon: IconBulb},
  { link: '', label: 'Recorder', icon: IconPlayerRecord },
  { link: '', label: 'History', icon: IconHistory},
  { link: '', label: 'Settings', icon: IconSettings },
];

interface NavbarSimpleProps {
  activePage?: string;
  onPageChange?: (page: string) => void;
}

export function NavbarSimple({ activePage, onPageChange }: NavbarSimpleProps) {
  const [active, setActive] = useState(activePage || 'Recorder');
  const [collapsed, setCollapsed] = useState(false);

  const handleClick = (label: string) => {
    setActive(label);
    if (onPageChange) {
      onPageChange(label);
    }
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const links = data.map((item) => (
    <NavLink
      className="link"
      data-active={item.label === active || undefined}
      data-collapsed={collapsed || undefined}
      data-label={item.label}
      href={item.link}
      key={item.label}
      disabled={item.label === 'Insights'}
      label={collapsed ? undefined : item.label}
      leftSection={<item.icon className="linkIcon" stroke={1.5} />}
      color="white"
      onClick={(event) => {
        event.preventDefault();
        handleClick(item.label);
      }}
    />
  ));

  return (
    <nav className={`navbar ${collapsed ? 'collapsed' : ''}`}>
      <div className="navbarMain">
        <Group className="header" justify="space-between">
          <Button 
            className="navbar-toggle"
            onClick={toggleCollapse}
            aria-label={collapsed ? 'Expand navbar' : 'Collapse navbar'}
          >
            {collapsed ? (
              <IconChevronRight size={14} stroke={2} />
            ) : (
              <IconChevronLeft size={14} stroke={2} />
            )}
          </Button>
        </Group>
        {links}
      </div>
    </nav>
  );
}
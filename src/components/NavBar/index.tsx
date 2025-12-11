import { useState } from 'react';
import {
  IconHome,
  IconPlayerRecord,
  IconBulb,
  IconHistory,
  IconSettings,
} from '@tabler/icons-react';
import { Group, NavLink } from '@mantine/core';
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

  const handleClick = (label: string) => {
    setActive(label);
    if (onPageChange) {
      onPageChange(label);
    }
  };

  const links = data.map((item) => (
    <NavLink
      className="link"
      data-active={item.label === active || undefined}
      href={item.link}
      key={item.label}
      disabled={item.label === 'Insights'}
      label={item.label}
      leftSection={<item.icon className="linkIcon" stroke={1.5} />}
      color="white"
      onClick={(event) => {
        event.preventDefault();
        handleClick(item.label);
      }}
    />
  ));

  return (
    <nav className="navbar">
      <div className="navbarMain">
        <Group className="header" justify="space-between">
        </Group>
        {links}
      </div>
    </nav>
  );
}
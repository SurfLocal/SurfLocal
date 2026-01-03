import { ReactNode } from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
  allowScroll?: boolean;
}

const Layout = ({ children, showNav = true, allowScroll = false }: LayoutProps) => {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {showNav && <Navbar />}
      <main className={`flex-1 ${allowScroll ? 'overflow-y-auto' : 'overflow-hidden'}`}>{children}</main>
    </div>
  );
};

export default Layout;

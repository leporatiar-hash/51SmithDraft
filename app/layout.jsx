import './globals.css';

export const metadata = {
  title: 'Team Auction',
  description: 'Season standings for our NFL team auction league',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

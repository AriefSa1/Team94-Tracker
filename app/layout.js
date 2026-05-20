import './globals.css'

export const metadata = {
  title: 'La Lovely · Change Tracker',
  description: 'Track, evaluate & analyze every change in your Shopee store',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans bg-paper text-ink antialiased">{children}</body>
    </html>
  )
}

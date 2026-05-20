/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink:    { DEFAULT:'#1a1814', 2:'#5c5a54', 3:'#9c9a94' },
        paper:  { DEFAULT:'#faf9f6', 2:'#f2f0eb', 3:'#e8e5de' },
        jade:   { DEFAULT:'#2d8a6e', bg:'#ebf5f1', txt:'#1a5c49' },
        rose:   { DEFAULT:'#e85d4a', bg:'#fdf0ee', txt:'#9e2d1e' },
        gold:   { DEFAULT:'#c17d2a', bg:'#fdf3e3', txt:'#7d4e10' },
        cobalt: { DEFAULT:'#2d5fa8', bg:'#eaf0fb', txt:'#1a3d70' },
        plum:   { DEFAULT:'#7b4ea8', bg:'#f4eefb', txt:'#4a2870' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,24,20,.04), 0 2px 8px rgba(26,24,20,.06)',
        lg:   '0 4px 6px rgba(26,24,20,.04), 0 12px 28px rgba(26,24,20,.1)',
      },
      animation: {
        'fade-up': 'fadeUp .3s cubic-bezier(.4,0,.2,1) both',
        'scale-in': 'scaleIn .2s cubic-bezier(.4,0,.2,1) both',
        'slide-down': 'slideDown .2s cubic-bezier(.4,0,.2,1) both',
      },
      keyframes: {
        fadeUp:    { from:{opacity:0,transform:'translateY(10px)'}, to:{opacity:1,transform:'none'} },
        scaleIn:   { from:{opacity:0,transform:'scale(.96)'}, to:{opacity:1,transform:'none'} },
        slideDown: { from:{opacity:0,transform:'translateY(-5px)'}, to:{opacity:1,transform:'none'} },
      },
    },
  },
  plugins: [],
}

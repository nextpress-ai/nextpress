import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)',
  				foreground: 'var(--destructive-foreground)'
  			},
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			chart: {
  				'1': 'var(--chart-1)',
  				'2': 'var(--chart-2)',
  				'3': 'var(--chart-3)',
  				'4': 'var(--chart-4)',
  				'5': 'var(--chart-5)'
  			},
sidebar: {
				DEFAULT: 'hsl(var(--sidebar-background))',
				foreground: 'hsl(var(--sidebar-foreground))',
				primary: 'hsl(var(--sidebar-primary))',
				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
				accent: 'hsl(var(--sidebar-accent))',
				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
				border: 'hsl(var(--sidebar-border))',
				ring: 'hsl(var(--sidebar-ring))'
			},
			npb: {
				surface: {
					base: 'var(--npb-surface-base)',
					raised: 'var(--npb-surface-raised)',
					inset: 'var(--npb-surface-inset)',
					overlay: 'var(--npb-surface-overlay)',
					header: 'var(--npb-surface-header)',
				},
				text: {
					primary: 'var(--npb-text-primary)',
					secondary: 'var(--npb-text-secondary)',
					muted: 'var(--npb-text-muted)',
					inverse: 'var(--npb-text-inverse)',
				},
				border: {
					default: 'var(--npb-border-default)',
					subtle: 'var(--npb-border-subtle)',
					strong: 'var(--npb-border-strong)',
				},
				divider: 'var(--npb-divider)',
				interactive: {
					bg: 'var(--npb-interactive-bg)',
					'bg-hover': 'var(--npb-interactive-bg-hover)',
					'bg-active': 'var(--npb-interactive-bg-active)',
					text: 'var(--npb-interactive-text)',
					'text-active': 'var(--npb-interactive-text-active)',
				},
				canvas: {
					bg: 'var(--npb-canvas-bg)',
					page: 'var(--npb-canvas-page)',
				},
				accent: {
					DEFAULT: 'var(--npb-accent)',
					hover: 'var(--npb-accent-hover)',
				},
				focus: 'var(--npb-focus-ring)',
				status: {
					success: 'var(--npb-status-success)',
					warning: 'var(--npb-status-warning)',
					error: 'var(--npb-status-error)',
					info: 'var(--npb-status-info)',
				},
			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [tailwindcssAnimate, typography],
} satisfies Config;

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SettingsProvider } from '@/context/settings'
import { AuthProvider } from '@/context/auth'

createRoot(document.getElementById("root")!).render(
	<SettingsProvider>
		<AuthProvider>
			<App />
		</AuthProvider>
	</SettingsProvider>
);

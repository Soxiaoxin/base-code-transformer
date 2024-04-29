import ReactDOM from 'react-dom/client'
import './App.css';
import App from './App';
import LoadApp from './components/LoadApp';
import './locales/i18n' // 支持国际化
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <LoadApp >
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </LoadApp>
);

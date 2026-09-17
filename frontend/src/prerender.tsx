import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Landing } from './pages/Landing';

export function render() {
    return renderToString(
        <StaticRouter location="/">
            <ThemeProvider><Landing /></ThemeProvider>
        </StaticRouter>,
    );
}

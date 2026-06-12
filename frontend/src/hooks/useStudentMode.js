import { useEffect } from 'react';
import axios from 'axios';
import { API } from '../utils';

function applyMode(mode) {
  const html = document.documentElement;
  if (mode === 'light') {
    html.classList.add('mode-light');
    html.style.setProperty('--mode-bg', '#f0f4f8');
    html.style.setProperty('--mobile-header-bg', 'rgba(255,255,255,0.95)');
    html.style.setProperty('--text-muted', 'rgba(30, 41, 59, 0.85)');
    html.style.setProperty('--text-hint',  'rgba(71, 85, 105, 0.8)');
  } else {
    html.classList.remove('mode-light');
    html.style.setProperty('--mode-bg', '#0B1120');
    html.style.setProperty('--mobile-header-bg', 'rgba(11,17,32,0.9)');
    html.style.setProperty('--text-muted', 'rgba(255, 255, 255, 0.82)');
    html.style.setProperty('--text-hint',  'rgba(255, 255, 255, 0.65)');
  }
}

export function useStudentMode() {
  useEffect(() => {
    // Apply cached mode instantly to avoid flash
    const cached = sessionStorage.getItem('student_mode');
    if (cached) applyMode(cached);

    // Fetch latest from server
    axios.get(`${API}/app-settings`)
      .then(res => {
        const mode = res.data.student_mode || 'dark';
        sessionStorage.setItem('student_mode', mode);
        applyMode(mode);
      })
      .catch(() => applyMode(cached || 'dark'));
  }, []);
}

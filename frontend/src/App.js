import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';
import MatrixBackground from './components/MatrixBackground';
import BubblesBackground from './components/BubblesBackground';
import TeacherLogin from './components/teacher/TeacherLogin';
import Dashboard from './components/teacher/Dashboard';
import QuizEditor from './components/teacher/QuizEditor';
import QuizMonitor from './components/teacher/QuizMonitor';
import QuizResults from './components/teacher/QuizResults';
import GradeAnswers from './components/teacher/GradeAnswers';
import Settings from './components/teacher/Settings';
import TeacherProjects from './components/teacher/TeacherProjects';
import ProjectSubmissions from './components/teacher/ProjectSubmissions';
import QuestionBank from './components/teacher/QuestionBank';
import TeacherManagement from './components/teacher/TeacherManagement';
import Gradebooks from './components/teacher/Gradebooks';
import GradebookDetail from './components/teacher/GradebookDetail';
import Rubrics from './components/teacher/Rubrics';
import RubricEditor from './components/teacher/RubricEditor';
import RubricEvaluate from './components/teacher/RubricEvaluate';
import StudentJoin from './components/student/StudentJoin';
import StudentLobby from './components/student/StudentLobby';
import StudentExam from './components/student/StudentExam';
import StudentResult from './components/student/StudentResult';
import StudentProject from './components/student/StudentProject';
import StudentGrades from './components/student/StudentGrades';
import StudentJoinGrade from './components/student/StudentJoinGrade';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('teacherToken');
  return token ? children : <Navigate to="/teacher/login" replace />;
};

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('teacherToken');
  if (!token) return <Navigate to="/teacher/login" replace />;
  if (localStorage.getItem('teacherRole') !== 'admin') return <Navigate to="/teacher/dashboard" replace />;
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <div dir="rtl" className="font-tajawal">
        <MatrixBackground />
        <BubblesBackground />
        <Toaster position="top-center" richColors />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<StudentJoin />} />
            <Route path="/join/:urlCode" element={<StudentJoin />} />
            <Route path="/project/:code" element={<StudentProject />} />
            <Route path="/my-grades" element={<StudentGrades />} />
            <Route path="/g/:code" element={<StudentJoinGrade />} />
            <Route path="/quiz/:quizId/lobby" element={<StudentLobby />} />
            <Route path="/quiz/:quizId/exam" element={<StudentExam />} />
            <Route path="/quiz/:quizId/result/:submissionId" element={<StudentResult />} />
            <Route path="/teacher/login" element={<TeacherLogin />} />
            <Route path="/teacher/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/teacher/projects" element={<ProtectedRoute><TeacherProjects /></ProtectedRoute>} />
            <Route path="/teacher/projects/:projectId/submissions" element={<ProtectedRoute><ProjectSubmissions /></ProtectedRoute>} />
            <Route path="/teacher/question-bank" element={<ProtectedRoute><QuestionBank /></ProtectedRoute>} />
            <Route path="/teacher/gradebooks" element={<ProtectedRoute><Gradebooks /></ProtectedRoute>} />
            <Route path="/teacher/gradebooks/:gradebookId" element={<ProtectedRoute><GradebookDetail /></ProtectedRoute>} />
            <Route path="/teacher/rubrics" element={<ProtectedRoute><Rubrics /></ProtectedRoute>} />
            <Route path="/teacher/rubrics/new" element={<ProtectedRoute><RubricEditor /></ProtectedRoute>} />
            <Route path="/teacher/rubrics/:rubricId/edit" element={<ProtectedRoute><RubricEditor /></ProtectedRoute>} />
            <Route path="/teacher/rubrics/:rubricId/evaluate" element={<ProtectedRoute><RubricEvaluate /></ProtectedRoute>} />
            <Route path="/teacher/teachers" element={<AdminRoute><TeacherManagement /></AdminRoute>} />
            <Route path="/teacher/quiz/new" element={<ProtectedRoute><QuizEditor /></ProtectedRoute>} />
            <Route path="/teacher/quiz/:quizId/edit" element={<ProtectedRoute><QuizEditor /></ProtectedRoute>} />
            <Route path="/teacher/quiz/:quizId/monitor" element={<ProtectedRoute><QuizMonitor /></ProtectedRoute>} />
            <Route path="/teacher/quiz/:quizId/results" element={<ProtectedRoute><QuizResults /></ProtectedRoute>} />
            <Route path="/teacher/quiz/:quizId/grade" element={<ProtectedRoute><GradeAnswers /></ProtectedRoute>} />
            <Route path="/teacher/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;

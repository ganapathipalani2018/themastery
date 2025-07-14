'use client';

import { useState } from 'react';
import { useLogin, useRegister, useProfile, useIsAuthenticated } from '../../lib/hooks/useAuth';
import { useResumes, useTemplates } from '../../lib/hooks/useResume';

export default function ApiTestPage() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('TestPass123!');
  const [firstName, setFirstName] = useState('Test');
  const [lastName, setLastName] = useState('User');

  // Authentication hooks
  const { isAuthenticated, isLoading: authLoading, user } = useIsAuthenticated();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const { data: profile } = useProfile();

  // Resume hooks
  const { data: resumes, isLoading: resumesLoading, error: resumesError } = useResumes();
  const { data: templates, isLoading: templatesLoading } = useTemplates();

  const handleLogin = () => {
    loginMutation.mutate({ email, password });
  };

  const handleRegister = () => {
    registerMutation.mutate({ email, password, firstName, lastName });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">API Integration Test</h1>

          {/* Authentication Status */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Authentication Status</h2>
            {authLoading ? (
              <p className="text-blue-600">Loading authentication status...</p>
            ) : isAuthenticated ? (
              <div>
                <p className="text-green-600 font-medium">✅ Authenticated</p>
                <div className="mt-2 text-sm text-gray-600">
                  <p><strong>User ID:</strong> {user?.id}</p>
                  <p><strong>Email:</strong> {user?.email}</p>
                  <p><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
                  <p><strong>Verified:</strong> {user?.isVerified ? 'Yes' : 'No'}</p>
                </div>
              </div>
            ) : (
              <p className="text-red-600 font-medium">❌ Not authenticated</p>
            )}
          </div>

          {/* Authentication Forms */}
          {!isAuthenticated && (
            <div className="mb-8 grid md:grid-cols-2 gap-6">
              {/* Login Form */}
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Login</h3>
                <div className="space-y-4">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleLogin}
                    disabled={loginMutation.isPending}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loginMutation.isPending ? 'Logging in...' : 'Login'}
                  </button>
                  {loginMutation.error && (
                    <p className="text-red-600 text-sm">
                      Login failed: {loginMutation.error.message}
                    </p>
                  )}
                  {loginMutation.isSuccess && (
                    <p className="text-green-600 text-sm">Login successful!</p>
                  )}
                </div>
              </div>

              {/* Register Form */}
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Register</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleRegister}
                    disabled={registerMutation.isPending}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {registerMutation.isPending ? 'Registering...' : 'Register'}
                  </button>
                  {registerMutation.error && (
                    <p className="text-red-600 text-sm">
                      Registration failed: {registerMutation.error.message}
                    </p>
                  )}
                  {registerMutation.isSuccess && (
                    <p className="text-green-600 text-sm">Registration successful!</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* API Data Display */}
          {isAuthenticated && (
            <div className="space-y-6">
              {/* Resumes */}
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Resumes</h3>
                {resumesLoading ? (
                  <p className="text-gray-600">Loading resumes...</p>
                ) : resumesError ? (
                  <p className="text-red-600">Error loading resumes: {resumesError.message}</p>
                ) : resumes && resumes.data.length > 0 ? (
                  <div className="space-y-2">
                    {resumes.data.map((resume) => (
                      <div key={resume.id} className="p-3 bg-gray-50 rounded-md">
                        <h4 className="font-medium">{resume.title}</h4>
                        <p className="text-sm text-gray-600">
                          Template: {resume.templateId} | Public: {resume.isPublic ? 'Yes' : 'No'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No resumes found</p>
                )}
              </div>

              {/* Templates */}
              <div className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Templates</h3>
                {templatesLoading ? (
                  <p className="text-gray-600">Loading templates...</p>
                ) : templates && templates.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <div key={template.id} className="p-3 bg-gray-50 rounded-md">
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                        <p className="text-xs text-gray-500 mt-1">Category: {template.category}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No templates found</p>
                )}
              </div>
            </div>
          )}

          {/* API Status */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">API Status</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Backend URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}</p>
                <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
              </div>
              <div>
                <p><strong>React Query DevTools:</strong> {process.env.NODE_ENV === 'development' ? 'Enabled' : 'Disabled'}</p>
                <p><strong>Auto Retry:</strong> Enabled (3x for queries, 2x for mutations)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
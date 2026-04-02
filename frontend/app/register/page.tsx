'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const FIELDS = [
  { key: 'fullName',    label: 'Full name',        type: 'text',     placeholder: 'Priya Sharma',          required: true  },
  { key: 'email',       label: 'Email',             type: 'email',    placeholder: 'you@email.com',          required: true  },
  { key: 'phone',       label: 'Phone (optional)',  type: 'tel',      placeholder: '+91 98765 43210',        required: false },
  { key: 'password',    label: 'Password',          type: 'password', placeholder: 'Min 6 characters',       required: true  },
  { key: 'dateOfBirth', label: 'Date of birth',     type: 'date',     placeholder: '',                       required: true  },
  { key: 'timeOfBirth', label: 'Time of birth',     type: 'time',     placeholder: '',                       required: true  },
  { key: 'placeOfBirth',label: 'Place of birth',    type: 'text',     placeholder: 'City, State, Country',   required: true  },
];

export default function RegisterPage() {
  const { login } = useAuth();
  const router    = useRouter();
  const [form, setForm] = useState<Record<string, string>>({
    fullName: '', email: '', phone: '', password: '',
    dateOfBirth: '', timeOfBirth: '', placeOfBirth: '', gender: 'Male',
  });
  const [loading, setLoading] = useState(false);

  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', { ...form, role: 'user' });
      login(data.token, data.user);
      toast.success('Account created! Welcome to AstroChat ✦');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-indigo-100 rounded-full flex items-center justify-center text-2xl">✦</div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Create your profile</h1>
            <p className="text-sm text-gray-500">Your birth details help personalise predictions</p>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-3">
          {FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-sm text-gray-600 block mb-1">{f.label}</label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                required={f.required}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
                value={form[f.key]}
                onChange={e => upd(f.key, e.target.value)}
              />
            </div>
          ))}

          {/* Gender */}
          <div>
            <label className="text-sm text-gray-600 block mb-1">Gender</label>
            <div className="flex gap-2">
              {['Male', 'Female', 'Other'].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => upd('gender', g)}
                  className={`flex-1 py-2 rounded-lg text-sm border transition ${
                    form.gender === g
                      ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Creating account...' : 'Create account →'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already registered?{' '}
          <a href="/" className="text-indigo-600 hover:underline font-medium">Sign in</a>
        </p>
      </div>
    </main>
  );
}

import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-8">
        <h1 className="text-xl font-semibold mb-6 text-center">アンケート集計システム</h1>
        <LoginForm />
      </div>
    </main>
  );
}

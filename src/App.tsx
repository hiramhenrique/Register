import { useEffect, useState, type FormEvent } from "react";
import "./App.css";
import Cadastro from "./assets/pages/Cadastro";
import TelaContratado from "./assets/pages/telaContratado";
import TelaContratante from "./assets/pages/TelaContratante";
import { getUserByEmailAndPassword } from "./firebase";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    try {
      const matchedUser = await getUserByEmailAndPassword(email, password);
      if (!matchedUser) {
        setLoginError("E-mail ou senha inválidos.");
        return;
      }
      window.localStorage.setItem("currentUserEmail", matchedUser.email);
      if (matchedUser.tipo === "contratado") {
        window.location.hash = "#/contratado";
        setPage("contratado");
      } else {
        window.location.hash = "#/contratante";
        setPage("contratante");
      }
    } catch (error) {
      console.error(error);
      setLoginError(
        "Erro ao processar login. Verifique a configuração do Firebase ou o console para detalhes.",
      );
    }
  };

  const [page, setPage] = useState<
    "login" | "cadastro" | "contratado" | "contratante"
  >(() => {
    if (window.location.hash === "#/cadastro") return "cadastro";
    if (window.location.hash === "#/contratado") return "contratado";
    if (window.location.hash === "#/contratante") return "contratante";
    return "login";
  });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#/cadastro") setPage("cadastro");
      else if (window.location.hash === "#/contratado") setPage("contratado");
      else if (window.location.hash === "#/contratante") setPage("contratante");
      else setPage("login");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleCadastro = () => {
    window.location.hash = "#/cadastro";
  };

  if (page === "cadastro") return <Cadastro />;
  if (page === "contratado") return <TelaContratado />;
  if (page === "contratante") return <TelaContratante />;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-3 py-4 sm:px-4">
      <div className="w-full max-w-md rounded-2xl sm:rounded-[32px] border border-white/10 bg-white/5 p-6 sm:p-8 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold">Login</h1>
          <p className="text-xs sm:text-sm text-white/70 mt-2">
            Entre com seu e-mail e senha
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label
              className="mb-2 block text-xs sm:text-sm font-medium text-white/80"
              htmlFor="email"
            >
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 px-3 sm:px-4 py-2 sm:py-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/20"
              placeholder="Digite seu email"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-xs sm:text-sm font-medium text-white/80"
              htmlFor="password"
            >
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 px-3 sm:px-4 py-2 sm:py-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/20"
              placeholder="Digite sua senha"
            />
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            <button
              type="submit"
              className="rounded-2xl sm:rounded-3xl bg-white px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-black transition hover:bg-white/90"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={handleCadastro}
              className="rounded-2xl sm:rounded-3xl border border-white/20 bg-white/5 px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white transition hover:bg-white/10"
            >
              Cadastrar
            </button>
          </div>
          {loginError && (
            <p className="text-xs sm:text-sm text-red-400">{loginError}</p>
          )}
        </form>
      </div>
    </div>
  );
}

export default App;

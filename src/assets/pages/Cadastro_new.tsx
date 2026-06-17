import { useState, type FormEvent } from "react";
import { createUser, getUserByEmail } from "../../firebase";

type CadastroUser = {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  tipo: "contratante" | "contratado";
};

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [tipo, setTipo] = useState<"contratante" | "contratado" | "">("");

  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // campos obrigatórios
    if (!nome || !email || !telefone || !senha || !confirma || !tipo) {
      setError("Preencha todos os campos.");
      return;
    }

    // senhas
    if (senha !== confirma) {
      setError("Senhas não coincidem.");
      return;
    }

    try {
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        setError("E-mail já cadastrado.");
        return;
      }

      const newUser: CadastroUser = {
        nome,
        email,
        telefone,
        senha,
        tipo: tipo as "contratante" | "contratado",
      };
      await createUser(newUser);
      window.location.hash = "#/login";
    } catch (error) {
      console.error(error);
      setError(
        "Erro ao cadastrar. Verifique a configuração do Firebase ou o console para detalhes.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-3 py-4 sm:px-4">
      <div className="w-full max-w-md rounded-2xl sm:rounded-[32px] border border-white/10 bg-white/5 p-6 sm:p-8 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="mb-4 sm:mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold">Cadastro</h1>
          <p className="text-xs sm:text-sm text-white/70 mt-1 sm:mt-2">
            Preencha seus dados para criar uma conta
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label
              className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-white/80"
              htmlFor="nome"
            >
              Nome
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              value={nome}
              onChange={(ev) => setNome(ev.target.value)}
              className="w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 px-3 sm:px-4 py-2 sm:py-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/20"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label
              className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-white/80"
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
              onChange={(ev) => setEmail(ev.target.value)}
              className="w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 px-3 sm:px-4 py-2 sm:py-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/20"
              placeholder="seu@exemplo.com"
            />
          </div>

          <div>
            <label
              className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-white/80"
              htmlFor="telefone"
            >
              Telefone
            </label>
            <input
              id="telefone"
              name="telefone"
              type="tel"
              required
              value={telefone}
              onChange={(ev) => setTelefone(ev.target.value)}
              className="w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 px-3 sm:px-4 py-2 sm:py-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/20"
              placeholder="(00) 90000-0000"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-white/80">
              Você é
            </legend>
            <div className="flex gap-2 sm:gap-4">
              <label className="flex-1 sm:flex-none flex items-center gap-2 rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 px-3 sm:px-4 py-2 sm:py-3 cursor-pointer transition hover:bg-white/10">
                <input
                  type="radio"
                  name="tipo"
                  value="contratante"
                  checked={tipo === "contratante"}
                  onChange={() => setTipo("contratante")}
                  className="h-4 w-4 text-black accent-black"
                  required
                />
                <span className="text-xs sm:text-sm">Contratante</span>
              </label>
              <label className="flex-1 sm:flex-none flex items-center gap-2 rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 px-3 sm:px-4 py-2 sm:py-3 cursor-pointer transition hover:bg-white/10">
                <input
                  type="radio"
                  name="tipo"
                  value="contratado"
                  checked={tipo === "contratado"}
                  onChange={() => setTipo("contratado")}
                  className="h-4 w-4 text-black accent-black"
                  required
                />
                <span className="text-xs sm:text-sm">Contratado</span>
              </label>
            </div>
          </fieldset>

          <div>
            <label
              className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-white/80"
              htmlFor="senha"
            >
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              required
              value={senha}
              onChange={(ev) => setSenha(ev.target.value)}
              className="w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 px-3 sm:px-4 py-2 sm:py-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/20"
              placeholder="Escolha uma senha"
            />
          </div>

          <div>
            <label
              className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-white/80"
              htmlFor="confirma"
            >
              Confirmar senha
            </label>
            <input
              id="confirma"
              name="confirma"
              type="password"
              required
              value={confirma}
              onChange={(ev) => setConfirma(ev.target.value)}
              className="w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 px-3 sm:px-4 py-2 sm:py-3 text-sm text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/20"
              placeholder="Repita a senha"
            />
          </div>

          {error && <p className="text-xs sm:text-sm text-red-400">{error}</p>}

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 pt-2">
            <button
              type="submit"
              className="rounded-2xl sm:rounded-3xl bg-white px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-black transition hover:bg-white/90"
            >
              Cadastrar
            </button>
            <button
              type="button"
              onClick={() => (window.location.hash = "#/login")}
              className="rounded-2xl sm:rounded-3xl border border-white/20 bg-white/5 px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white transition hover:bg-white/10"
            >
              Voltar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

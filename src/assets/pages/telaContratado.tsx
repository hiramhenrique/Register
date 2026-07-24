import { useEffect, useState, type ChangeEvent } from "react";
import {
  getUserByEmail,
  subscribeToContractorServices,
  saveServiceItem,
  updateServiceStatus,
  updateUserPixKey,
  deleteServiceItem,
  removeServicePhoto,
  type ServiceItem,
} from "../../firebase";

export default function TelaContratado() {
  const [nome, setNome] = useState("Cliente");
  const [servico, setServico] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [fotoNome, setFotoNome] = useState("");
  const [valor, setValor] = useState("");
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState<"add" | "history">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [imageModalName, setImageModalName] = useState<string>("");
  const [pixKey, setPixKey] = useState("");
  const [isEditingPix, setIsEditingPix] = useState(false);

  useEffect(() => {
    const currentEmail = window.localStorage.getItem("currentUserEmail") || "";
    if (!currentEmail) return;

    // Load user info once
    getUserByEmail(currentEmail)
      .then((currentUser) => {
        if (currentUser) {
          setNome(currentUser.nome);
          setPixKey(currentUser.pixKey || "");
        }
      })
      .catch(() => setNome("Cliente"));

    // Subscribe to real-time updates — reflects changes from any device instantly
    const unsubscribe = subscribeToContractorServices(currentEmail, (contractorServices) => {
      setServices(contractorServices);
    });

    return () => unsubscribe();
  }, []);

  const handleFotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFotoNome("");
      setFotoUrl("");
      return;
    }

    setFotoNome(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEnviar = async () => {
    setError("");
    if (!servico || !valor) {
      setError("Preencha serviço e valor.");
      return;
    }

    const currentEmail = window.localStorage.getItem("currentUserEmail") || "";
    if (!currentEmail) {
      setError("Usuário não autenticado.");
      return;
    }

    const serviceData: Omit<ServiceItem, "id"> = {
      servico,
      fotoNome: fotoNome || "Sem foto",
      fotoUrl,
      valor,
      createdAt: new Date().toLocaleString("pt-BR"),
      createdAtISO: new Date().toISOString(),
      status: "aberto",
      emailContratado: currentEmail,
      nomeContratado: nome,
    };

    if (editingId) {
      const existing = services.find((it) => it.id === editingId);
      const updatedService = {
        ...existing,
        servico: serviceData.servico,
        valor: serviceData.valor,
        fotoNome: serviceData.fotoNome,
        fotoUrl: serviceData.fotoUrl,
        emailContratado: currentEmail,
        nomeContratado: nome,
        status: existing?.status || "aberto",
        createdAt: existing?.createdAt || serviceData.createdAt,
        createdAtISO: existing?.createdAtISO || serviceData.createdAtISO,
      } as ServiceItem;

      await saveServiceItem({ ...updatedService, id: editingId });
      setServices((current) =>
        current.map((it) => (it.id === editingId ? updatedService : it)),
      );
      setEditingId(null);
    } else {
      const id = await saveServiceItem(serviceData);
      setServices((current) => [{ ...serviceData, id }, ...current]);
    }

    setServico("");
    setFotoNome("");
    setFotoUrl("");
    setValor("");
    setActiveView("history");
  };

  const handleDelete = async (id: string) => {
    await deleteServiceItem(id);
    setServices((current) => current.filter((it) => it.id !== id));
  };

  const requestDelete = (id: string, servico: string) => {
    setConfirmDeleteId(id);
    setConfirmDeleteName(servico);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    await handleDelete(confirmDeleteId);
    setConfirmDeleteId(null);
    setConfirmDeleteName("");
  };

  const handleCancelDelete = () => {
    setConfirmDeleteId(null);
    setConfirmDeleteName("");
  };

  const handleStartEdit = (item: ServiceItem) => {
    setEditingId(item.id);
    setServico(item.servico);
    setValor(item.valor);
    setFotoNome(item.fotoNome || "");
    setFotoUrl(item.fotoUrl || "");
    setActiveView("add");
  };

  const handleToggleStatus = async (id: string) => {
    const updated = services.find((it) => it.id === id);
    if (!updated) return;
    const nextStatus = updated.status === "aberto" ? "pago" : "aberto";
    await updateServiceStatus(id, nextStatus);
    setServices((current) =>
      current.map((it) => (it.id === id ? { ...it, status: nextStatus } : it)),
    );
  };

  const openImageModal = (url: string, name = "") => {
    setImageModalUrl(url);
    setImageModalName(name);
  };

  const closeImageModal = () => {
    setImageModalUrl(null);
    setImageModalName("");
  };

  const handleSavePix = async () => {
    const currentEmail = window.localStorage.getItem("currentUserEmail") || "";
    if (currentEmail && pixKey) {
      await updateUserPixKey(currentEmail, pixKey);
      setIsEditingPix(false);
    }
  };

  const handleRemovePhoto = async (id: string) => {
    await removeServicePhoto(id);
    setServices((current) =>
      current.map((it) =>
        it.id === id ? { ...it, fotoUrl: "", fotoNome: "Sem foto" } : it,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-black text-white px-3 py-4 sm:px-4 sm:py-8">
      <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-8">
        <header className="flex flex-col gap-3 rounded-2xl sm:rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-6 shadow-2xl shadow-black/50 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold">Olá, {nome}</h1>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-white/70">
              Valor a receber:{" "}
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(
                services.reduce((acc, it) => {
                  try {
                    if (it.status !== "aberto") return acc;
                    const num =
                      Number(
                        (it.valor || "")
                          .replace(/[R$\s.]/g, "")
                          .replace(",", "."),
                      ) || 0;
                    return acc + num;
                  } catch {
                    return acc;
                  }
                }, 0),
              )}
            </p>
            <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2">
              {isEditingPix ? (
                <>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Chave PIX"
                    className="w-full sm:w-auto rounded-2xl sm:rounded-3xl border border-white/10 bg-black/40 px-2 sm:px-3 py-1 text-xs sm:text-sm text-white outline-none focus:border-white/30"
                  />
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleSavePix}
                      className="flex-1 sm:flex-none rounded-2xl sm:rounded-3xl bg-green-600 px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-white hover:bg-green-700"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingPix(false)}
                      className="flex-1 sm:flex-none rounded-2xl sm:rounded-3xl border border-white/20 bg-white/5 px-2 sm:px-3 py-1 text-xs sm:text-sm text-white hover:bg-white/10"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs sm:text-sm text-white/70">
                    PIX: {pixKey || "Não configurado"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEditingPix(true)}
                    className="rounded-2xl sm:rounded-3xl border border-white/20 bg-white/5 px-2 sm:px-3 py-1 text-xs sm:text-sm text-white hover:bg-white/10"
                  >
                    Editar
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-0">
            <div className="flex flex-wrap gap-2 sm:gap-3 flex-1 sm:flex-none">
              <button
                type="button"
                onClick={() => setActiveView("history")}
                className={`inline-flex items-center justify-center rounded-3xl border px-5 py-3 text-sm font-semibold transition ${
                  activeView === "history"
                    ? "border-white bg-white text-black"
                    : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                Histórico
              </button>
              <button
                type="button"
                onClick={() => setActiveView("add")}
                className={`inline-flex items-center justify-center rounded-3xl border px-5 py-3 text-sm font-semibold transition ${
                  activeView === "add"
                    ? "border-white bg-white text-black"
                    : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                Adicionar registro
              </button>
            </div>
            <div className="ml-6">
              <button
                type="button"
                onClick={() => {
                  window.localStorage.removeItem("currentUserEmail");
                  window.location.hash = "#";
                }}
                title="Sair"
                className="inline-flex items-center justify-center rounded-3xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-red-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M7 2a1 1 0 00-1 1v14a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1H7zm3 8a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
                <span className="ml-2">Sair</span>
              </button>
            </div>
          </div>
        </header>

        {activeView === "add" && (
          <section className="rounded-2xl sm:rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-6 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <h2 className="mb-3 sm:mb-4 text-xl sm:text-2xl font-semibold">
              Registrar serviço
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label
                  className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-white/80"
                  htmlFor="servico"
                >
                  Serviço executado
                </label>
                <input
                  id="servico"
                  type="text"
                  value={servico}
                  onChange={(event) => setServico(event.target.value)}
                  placeholder="Descreva o serviço"
                  className="w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-black/40 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/20"
                />
              </div>

              <div>
                <label className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-white/80">
                  Foto
                </label>
                <div className="flex gap-2">
                  {/* Botão Galeria */}
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs sm:text-sm text-white transition hover:bg-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    Galeria
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFotoChange}
                      className="sr-only"
                    />
                  </label>
                  {/* Botão Câmera */}
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs sm:text-sm text-white transition hover:bg-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586A2 2 0 0113 4.586L12.414 4h-4.828L7 4.586A2 2 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    Câmera
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFotoChange}
                      className="sr-only"
                    />
                  </label>
                </div>
                {fotoNome && (
                  <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-white/70">
                    Arquivo: {fotoNome}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="mb-1 sm:mb-2 block text-xs sm:text-sm font-medium text-white/80"
                  htmlFor="valor"
                >
                  Valor
                </label>
                <input
                  id="valor"
                  type="text"
                  value={valor}
                  onChange={(event) => setValor(event.target.value)}
                  placeholder="R$ 0,00"
                  className="w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-black/40 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/20"
                />
              </div>

              {error && (
                <p className="text-xs sm:text-sm text-red-400">{error}</p>
              )}

              <button
                type="button"
                onClick={handleEnviar}
                className="inline-flex w-full items-center justify-center rounded-2xl sm:rounded-3xl bg-white px-3 sm:px-5 py-2 sm:py-3 text-sm sm:text-base font-semibold text-black transition hover:bg-white/90"
              >
                Enviar
              </button>
            </div>
          </section>
        )}
        {/* Modal de confirmação de exclusão */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-4 sm:p-6 text-black">
              <h3 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold">
                Confirmar exclusão
              </h3>
              <p className="mb-4 sm:mb-6 text-xs sm:text-sm text-black/70">
                Você realmente deseja deletar o serviço "{confirmDeleteName}"? A
                foto também será removida. Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="rounded-2xl sm:rounded-3xl border border-white/20 bg-white/5 px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-semibold text-black/60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="rounded-2xl sm:rounded-3xl bg-red-600 px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-semibold text-white"
                >
                  Deletar
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal de visualização de imagem */}
        {imageModalUrl && (
          <div
            onClick={closeImageModal}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xl rounded-2xl bg-black p-3 sm:p-4"
            >
              <button
                type="button"
                onClick={closeImageModal}
                className="absolute right-2 sm:right-3 top-2 sm:top-3 inline-flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 text-lg sm:text-xl"
                aria-label="Fechar imagem"
              >
                ×
              </button>
              <div className="mx-auto max-h-[70vh] overflow-auto p-2">
                <img
                  src={imageModalUrl}
                  alt={imageModalName}
                  className="mx-auto h-auto max-w-full rounded-xl object-contain"
                />
                {/* nome da imagem removido para UI mais limpa */}
              </div>
            </div>
          </div>
        )}

        {activeView === "history" && (
          <section className="rounded-2xl sm:rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-6 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <h2 className="mb-3 sm:mb-4 text-xl sm:text-2xl font-semibold">
              Histórico de serviços
            </h2>
            {services.length === 0 ? (
              <p className="text-xs sm:text-sm text-white/70">
                Nenhum serviço registrado ainda.
              </p>
            ) : (
              <div className="space-y-6">
                {(() => {
                  // Agrupar por data (pt-BR)
                  const groups: Record<string, ServiceItem[]> = {};
                  services.forEach((it) => {
                    let dateKey = "—";
                    try {
                      if (it.createdAtISO)
                        dateKey = new Date(it.createdAtISO).toLocaleDateString(
                          "pt-BR",
                        );
                      else
                        dateKey = new Date(it.createdAt).toLocaleDateString(
                          "pt-BR",
                        );
                    } catch {
                      dateKey = it.createdAt.split(" ")[0] || it.createdAt;
                    }
                    if (!groups[dateKey]) groups[dateKey] = [];
                    groups[dateKey].push(it);
                  });
                  const sortedKeys = Object.keys(groups).sort((a, b) => {
                    // tentar ordenar por data
                    const da = new Date(
                      groups[a][0].createdAtISO || groups[a][0].createdAt,
                    ).getTime();
                    const db = new Date(
                      groups[b][0].createdAtISO || groups[b][0].createdAt,
                    ).getTime();
                    return db - da;
                  });

                  return sortedKeys.map((dateKey) => {
                    const items = groups[dateKey];
                    const dayTotal = items.reduce((acc, it) => {
                      const num =
                        Number(
                          (it.valor || "")
                            .replace(/[R$\s.]/g, "")
                            .replace(",", "."),
                        ) || 0;
                      return acc + num;
                    }, 0);

                    return (
                      <div key={dateKey} className="space-y-2 sm:space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                          <h3 className="text-base sm:text-lg font-semibold">
                            {dateKey}
                          </h3>
                          <span className="text-xs sm:text-sm text-white/70">
                            Total do dia:{" "}
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(dayTotal)}
                          </span>
                        </div>
                        <div className="space-y-2 sm:space-y-3">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className={`rounded-2xl sm:rounded-3xl p-3 sm:p-4 ${item.id === editingId ? "border-2 border-white bg-white/5 ring-2 ring-white/20" : "border border-white/10 bg-black/40"}`}
                            >
                              <div className="mb-2 flex flex-col gap-2">
                                <div>
                                  <p className="font-semibold text-white text-sm sm:text-base">
                                    {item.servico}
                                  </p>
                                  <span className="text-xs sm:text-sm text-white/60">
                                    {item.createdAt}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                  <p className="text-xs sm:text-sm text-white/70">
                                    {new Intl.NumberFormat("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    }).format(
                                      Number(
                                        (item.valor || "")
                                          .replace(/[R$\s.]/g, "")
                                          .replace(",", "."),
                                      ),
                                    )}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(item.id)}
                                    className={`rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold ${item.status === "aberto" ? "bg-yellow-400 text-black" : "bg-green-500 text-white"}`}
                                  >
                                    {item.status === "aberto"
                                      ? "Aberto"
                                      : "Pago"}
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1 sm:gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(item)}
                                  className="rounded-2xl sm:rounded-3xl border border-white/20 bg-white/5 px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-white transition hover:bg-white/10"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    requestDelete(item.id, item.servico)
                                  }
                                  className="rounded-2xl sm:rounded-3xl border border-red-500 bg-red-600/10 px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-red-400 transition hover:bg-red-600/20"
                                >
                                  Deletar
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    item.fotoUrl &&
                                    openImageModal(item.fotoUrl, item.fotoNome)
                                  }
                                  className="rounded-2xl sm:rounded-3xl border border-white/20 bg-white/5 px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-semibold text-white transition hover:bg-white/10"
                                  disabled={!item.fotoUrl}
                                >
                                  {item.fotoUrl ? "Ver img" : "Sem img"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    item.fotoUrl && handleRemovePhoto(item.id)
                                  }
                                  className="rounded-2xl sm:rounded-3xl border border-orange-500 bg-orange-600/10 px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold text-orange-400 transition hover:bg-orange-600/20"
                                  disabled={!item.fotoUrl}
                                >
                                  Remover foto
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

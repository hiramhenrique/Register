import { useEffect, useState } from 'react'
import {
  getUserByEmail,
  updateServiceStatus,
  subscribeToAllServices,
  type ServiceItem,
} from '../../firebase'
import {
  formatServiceDateTime,
  formatServiceDay,
  getServiceTimestamp,
} from '../../serviceDates'

export default function TelaContratante() {
  const [nome, setNome] = useState('Cliente')
  const [allServices, setAllServices] = useState<ServiceItem[]>([])
  const [pixModalEmail, setPixModalEmail] = useState<string | null>(null)
  const [pixModalKey, setPixModalKey] = useState<string>('')
  const [pixCopied, setPixCopied] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null)
  const [imageModalName, setImageModalName] = useState<string>('')

  useEffect(() => {
    const currentEmail = window.localStorage.getItem('currentUserEmail') || ''
    if (!currentEmail) return

    // Load user name once
    getUserByEmail(currentEmail)
      .then((currentUser) => { if (currentUser) setNome(currentUser.nome) })
      .catch(() => setNome('Cliente'))

    // Subscribe to real-time updates — fires on every add/edit/delete from any device
    const unsubscribe = subscribeToAllServices((services) => {
      setAllServices(services)
    })

    return () => unsubscribe()
  }, [])

  const handlePayAllContractor = async (contractorEmail: string) => {
    const contractor = await getUserByEmail(contractorEmail)
    const pixKey = contractor?.pixKey || 'Não configurada'
    setPixModalEmail(contractorEmail)
    setPixModalKey(pixKey)
    setSelectedServiceId(`all_${contractorEmail}`)
  }

  const handleRevertToOpen = async (serviceId: string) => {
    const service = allServices.find((s) => s.id === serviceId)
    if (!service) return

    await updateServiceStatus(serviceId, 'aberto')
    setAllServices((current) => current.map((s) => (s.id === serviceId ? { ...s, status: 'aberto' as const } : s)))
  }

  const handleConfirmPayment = async () => {
    if (!selectedServiceId) return

    if (selectedServiceId.startsWith('all_')) {
      const contractorEmail = selectedServiceId.replace('all_', '')
      const openServices = allServices.filter((svc) => svc.emailContratado === contractorEmail && svc.status === 'aberto')
      await Promise.all(openServices.map((svc) => updateServiceStatus(svc.id, 'pago')))

      const updatedServices = allServices.map((svc) =>
        svc.emailContratado === contractorEmail && svc.status === 'aberto'
          ? { ...svc, status: 'pago' as const }
          : svc,
      )
      setAllServices(updatedServices)
    } else {
      await updateServiceStatus(selectedServiceId, 'pago')
      setAllServices((current) => current.map((s) => (s.id === selectedServiceId ? { ...s, status: 'pago' as const } : s)))
    }

    setPixModalEmail(null)
    setSelectedServiceId(null)
  }

  const openImageModal = (url: string, name: string) => {
    setImageModalUrl(url)
    setImageModalName(name)
  }

  const closeImageModal = () => {
    setImageModalUrl(null)
    setImageModalName('')
  }

  const totalAberto = allServices.reduce((acc, service) => {
    if (service.status !== 'aberto') return acc
    const num = Number((service.valor || '').replace(/[R$\s.]/g, '').replace(',', '.')) || 0
    return acc + num
  }, 0)

  return (
    <div className="min-h-screen bg-black text-white px-3 py-4 sm:px-4 sm:py-8">
      <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-8">
        <header className="flex flex-col gap-3 rounded-2xl sm:rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-6 shadow-2xl shadow-black/50 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold">Olá, {nome}</h1>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-white/70">Valor a pagar (aberto): {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAberto)}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-0">
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem('currentUserEmail')
                window.location.hash = '#'
              }}
              title="Sair"
              className="inline-flex items-center justify-center rounded-2xl sm:rounded-3xl bg-red-600 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-lg hover:bg-red-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 sm:h-5 w-4 sm:w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M7 2a1 1 0 00-1 1v14a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1H7zm3 8a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
              <span className="ml-1 sm:ml-2 text-xs sm:text-sm">Sair</span>
            </button>
          </div>
        </header>

        <section className="rounded-2xl sm:rounded-[32px] border border-white/10 bg-white/5 p-4 sm:p-6 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <h2 className="mb-3 sm:mb-4 text-xl sm:text-2xl font-semibold">Serviços recebidos</h2>
          {allServices.length === 0 ? (
            <p className="text-sm text-white/70">Nenhum serviço ainda. Aguarde o contratado enviar.</p>
          ) : (
            <div className="space-y-6">
              {(() => {
                const sortedServices = [...allServices].sort(
                  (a, b) => getServiceTimestamp(a) - getServiceTimestamp(b),
                )

                // Agrupar por contratado
                const grouped: Record<string, ServiceItem[]> = {}
                sortedServices.forEach((service) => {
                  const key = service.nomeContratado || 'Desconhecido'
                  if (!grouped[key]) grouped[key] = []
                  grouped[key].push(service)
                })

                return Object.entries(grouped).map(([contractorName, services]) => {
                  const contractorEmail = services[0]?.emailContratado || ''
                  const openTotal = services.reduce((acc, s) => {
                    if (s.status !== 'aberto') return acc
                    const num = Number((s.valor || '').replace(/[R$\s.]/g, '').replace(',', '.')) || 0
                    return acc + num
                  }, 0)
                  const hasOpenServices = services.some((s) => s.status === 'aberto')

                  return (
                    <div key={contractorName} className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{contractorName}</h3>
                          <span className="text-sm text-white/70">A pagar: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(openTotal)}</span>
                        </div>
                        {hasOpenServices && (
                          <button
                            type="button"
                            onClick={() => handlePayAllContractor(contractorEmail)}
                            className="whitespace-nowrap rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-500"
                          >
                            Efetuar pagamento
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {(() => {
                          const groupedByDay: Record<string, ServiceItem[]> = {}

                          services.forEach((service) => {
                            const dayKey = formatServiceDay(service)
                            if (!groupedByDay[dayKey]) groupedByDay[dayKey] = []
                            groupedByDay[dayKey].push(service)
                          })

                          return Object.entries(groupedByDay).map(([dayKey, dayServices]) => (
                            <div key={`${contractorName}_${dayKey}`} className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">{dayKey}</h4>
                                <span className="text-xs text-white/50">{dayServices.length} registro{dayServices.length > 1 ? 's' : ''}</span>
                              </div>

                              <div className="space-y-3">
                                {dayServices.map((service) => (
                                  <div key={service.id} className="rounded-3xl border border-white/10 bg-black/40 p-4">
                                    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                                      <div className="flex-1">
                                        <p className="font-semibold text-white">{service.servico}</p>
                                        <span className="text-sm text-white/60">{formatServiceDateTime(service)}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm text-white/70">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number((service.valor || '').replace(/[R$\s.]/g, '').replace(',', '.')))}</p>
                                        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${service.status === 'aberto' ? 'bg-yellow-400 text-black' : 'bg-green-500 text-white'}`}>
                                          {service.status === 'aberto' ? 'Aberto' : 'Pago'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      {service.fotoUrl ? (
                                        <button
                                          type="button"
                                          onClick={() => openImageModal(service.fotoUrl, service.fotoNome)}
                                          className="rounded-3xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                                        >
                                          Visualizar imagem
                                        </button>
                                      ) : (
                                        <span className="text-sm text-white/50">Sem imagem</span>
                                      )}

                                      {service.status === 'pago' && (
                                        <button
                                          type="button"
                                          onClick={() => handleRevertToOpen(service.id)}
                                          className="rounded-3xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                                        >
                                          Alterar status
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        })()}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </section>

        {/* Modal de PIX */}
        {pixModalEmail && (
          <div onClick={() => setPixModalEmail(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md rounded-2xl bg-white p-6 text-black">
              <button
                type="button"
                onClick={() => setPixModalEmail(null)}
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
                aria-label="Fechar"
              >
                ×
              </button>
              <h3 className="mb-4 text-lg font-semibold">Chave PIX para pagamento</h3>
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-gray-100 p-3">
                <p className="flex-1 break-all text-sm font-mono">{pixModalKey}</p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(pixModalKey).then(() => {
                      setPixCopied(true)
                      setTimeout(() => setPixCopied(false), 2000)
                    })
                  }}
                  className="shrink-0 rounded-xl bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black"
                >
                  {pixCopied ? '✓ Copiado!' : 'Copiar'}
                </button>
              </div>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="w-full rounded-3xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Confirmar pagamento
              </button>
            </div>
          </div>
        )}

        {/* Modal de Imagem */}
        {imageModalUrl && (
          <div onClick={closeImageModal} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-xl rounded-2xl bg-black p-4">
              <button
                type="button"
                onClick={closeImageModal}
                className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700"
                aria-label="Fechar"
              >
                ×
              </button>
              <div className="mx-auto max-h-[70vh] overflow-auto p-2">
                <img src={imageModalUrl} alt={imageModalName} className="mx-auto h-auto max-w-full rounded-xl object-contain" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

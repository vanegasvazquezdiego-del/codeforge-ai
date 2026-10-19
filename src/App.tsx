import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { SideNav, TopBar } from '@/components/layout/Shell';
import { CommandPalette } from '@/components/CommandPalette';
import { AssistantPanel } from '@/components/assistant/AssistantPanel';
import { ExerciseGeneratorModal } from '@/components/assistant/ExerciseGeneratorModal';
import { EditorView } from '@/components/views/EditorView';
import { Toaster } from '@/components/ui/Toaster';
import { useHashRoute } from '@/lib/router';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useAssistant } from '@/store/assistant';
import { useWorkspace } from '@/store/workspace';
import { Spinner } from '@/components/ui/Primitives';

const ExercisesView = lazy(() =>
  import('@/components/views/ExercisesView').then((m) => ({ default: m.ExercisesView })),
);
const ProfileView = lazy(() =>
  import('@/components/views/ProfileView').then((m) => ({ default: m.ProfileView })),
);
const SettingsView = lazy(() =>
  import('@/components/views/SettingsView').then((m) => ({ default: m.SettingsView })),
);

export default function App() {
  const [view, navigate] = useHashRoute();
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);

  const assistantOpen = useAssistant((s) => s.open);
  const toggleAssistant = useAssistant((s) => s.toggle);
  const languageId = useWorkspace((s) => s.languageId);
  // El copiloto se monta una sola vez: columna fija en escritorio, overlay en movil.
  const isWide = useMediaQuery('(min-width: 1024px)');

  /* --- Atajos globales -------------------------------------------------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true;

      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (mod && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        toggleAssistant();
        return;
      }
      if (mod && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setNavOpen((v) => !v);
        return;
      }
      if (typing || mod) return;
      if (event.key === '1') navigate('editor');
      if (event.key === '2') navigate('exercises');
      if (event.key === '3') navigate('profile');
      if (event.key === '4') navigate('settings');
      if (event.key === '?') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, toggleAssistant]);

  const closeAssistant = useCallback(() => useAssistant.getState().setOpen(false), []);

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <SideNav view={view} navigate={navigate} open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          view={view}
          navigate={navigate}
          onOpenNav={() => setNavOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onToggleAssistant={toggleAssistant}
          assistantOpen={assistantOpen}
        />

        <div className="flex min-h-0 flex-1">
          <main id="contenido" className="min-w-0 flex-1 overflow-hidden">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center gap-2.5 text-[0.86rem] text-muted">
                  <Spinner className="text-accent" />
                  Cargando vista…
                </div>
              }
            >
              {view === 'editor' && <EditorView onToggleAssistant={toggleAssistant} />}
              {view === 'exercises' && (
                <ExercisesView onGenerate={() => setGeneratorOpen(true)} onOpenEditor={() => navigate('editor')} />
              )}
              {view === 'profile' && <ProfileView />}
              {view === 'settings' && <SettingsView />}
            </Suspense>
          </main>

          {/* Copiloto docked (escritorio) */}
          {assistantOpen && isWide && (
            <div className="w-[21rem] shrink-0 2xl:w-[25rem]">
              <AssistantPanel
                onClose={closeAssistant}
                onGenerateExercise={() => setGeneratorOpen(true)}
                onOpenSettings={() => navigate('settings')}
              />
            </div>
          )}

          {/* Copiloto como overlay (movil / tablet) */}
          {assistantOpen && !isWide && (
            <div className="fixed inset-0 z-40 flex">
              <button
                type="button"
                aria-label="Cerrar asistente"
                tabIndex={-1}
                onClick={closeAssistant}
                className="flex-1 cursor-default bg-bg-deep/60 backdrop-blur-sm anim-fade-in"
              />
              <div className="relative w-[min(24rem,92vw)] anim-slide-left">
                <button
                  type="button"
                  onClick={closeAssistant}
                  aria-label="Cerrar asistente"
                  className="absolute top-3 right-3 z-10 grid h-8 w-8 place-items-center rounded-md border border-line bg-surface text-muted shadow-e1"
                >
                  <X className="h-4 w-4" />
                </button>
                <AssistantPanel
                  onClose={closeAssistant}
                  onGenerateExercise={() => setGeneratorOpen(true)}
                  onOpenSettings={() => navigate('settings')}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        navigate={navigate}
        onGenerateExercise={() => setGeneratorOpen(true)}
      />

      <ExerciseGeneratorModal
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        onCreated={() => navigate('exercises')}
        initialLanguage={languageId}
      />

      <Toaster />
    </div>
  );
}
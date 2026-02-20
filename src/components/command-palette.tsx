"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Hammer, Plus, CheckCircle, Package, BookOpen, Search,
  FileText, Server, Users, Link as LinkIcon, Sparkles,
} from "lucide-react";
import { EXAMPLES_INDEX } from "@/lib/examples";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg">
        <Command
          className="rounded-xl border border-white/10 bg-[#1A1A1A] shadow-2xl overflow-hidden"
          loop
        >
          <Command.Input
            autoFocus
            placeholder="Type a command or search..."
            className="w-full px-4 py-3 text-sm bg-transparent border-b border-white/8 text-white placeholder:text-white/40 outline-none"
          />
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-white/40">
              No results found.
            </Command.Empty>

            <Command.Group heading="Actions" className="text-xs text-white/30 px-2 py-1.5">
              <CommandItem icon={Plus} label="Create New Skill" onSelect={() => go("/create")} />
              <CommandItem icon={CheckCircle} label="Validate Spec" onSelect={() => go("/validate")} />
              <CommandItem icon={Package} label="Generate Code" onSelect={() => go("/build")} />
              <CommandItem icon={Search} label="Analyze Skill" onSelect={() => go("/analyze")} />
              <CommandItem icon={Sparkles} label="Browse Examples" onSelect={() => go("/examples")} />
              <CommandItem icon={Hammer} label="Dashboard" onSelect={() => go("/")} />
            </Command.Group>

            <Command.Separator className="h-px bg-white/8 my-1" />

            <Command.Group heading="Examples" className="text-xs text-white/30 px-2 py-1.5">
              {EXAMPLES_INDEX.map(ex => {
                const icons: Record<string, typeof FileText> = {
                  claude: FileText, mcp: Server, crewai: Users, langchain: LinkIcon,
                };
                const Icon = icons[ex.framework] || FileText;
                return (
                  <CommandItem
                    key={ex.name}
                    icon={Icon}
                    label={ex.display_name}
                    subtitle={ex.framework}
                    onSelect={() => go(`/examples/${ex.name}`)}
                  />
                );
              })}
            </Command.Group>
          </Command.List>

          <div className="border-t border-white/8 px-4 py-2 text-xs text-white/30 flex items-center gap-4">
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono text-[10px]">Esc</kbd> close</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono text-[10px]">&uarr;&darr;</kbd> navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono text-[10px]">Enter</kbd> select</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({
  icon: Icon,
  label,
  subtitle,
  onSelect,
}: {
  icon: typeof Plus;
  label: string;
  subtitle?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 cursor-pointer data-[selected=true]:bg-white/8 data-[selected=true]:text-white transition-colors"
    >
      <Icon className="h-4 w-4 shrink-0 text-white/40" />
      <span className="flex-1">{label}</span>
      {subtitle && <span className="text-xs text-white/30">{subtitle}</span>}
    </Command.Item>
  );
}

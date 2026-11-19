import { useAuthStore } from "@/app/store/authStore";
import { MrlVersionList } from "../components/MrlVersionList";
import { MrlVersionDetail } from "../components/MrlVersionDetail";
import { MrlVersionLookup } from "../components/MrlVersionLookup";
import { MrlVersionEditor } from "../components/MrlVersionEditor";
import { MrlVersionImport } from "../components/MrlVersionImport";
import { useMrlWorkspace } from "../hooks/useMrlWorkspace";

export function MrlVersionsPage() {
  const user = useAuthStore((state) => state.user);
  const scope = [
    user?.id,
    user?.organizationId,
    user?.permissions.toSorted().join("|"),
  ].join(":");
  return (
    <MrlWorkspace
      key={scope}
      scope={scope}
      canManage={Boolean(user?.permissions.includes("platform.configure"))}
    />
  );
}

function MrlWorkspace({
  scope,
  canManage,
}: {
  scope: string;
  canManage: boolean;
}) {
  const workspace = useMrlWorkspace(scope, canManage);
  return (
    <div className="space-y-6 pb-8">
      <MrlVersionList {...workspace.list} />
      <MrlVersionDetail {...workspace.detailDialog} />
      <MrlVersionLookup {...workspace.lookupDialog} />
      <MrlVersionEditor {...workspace.editorDialog} />
      <MrlVersionImport {...workspace.importDialog} />
    </div>
  );
}

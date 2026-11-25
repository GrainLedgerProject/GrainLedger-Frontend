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
  const canManage = Boolean(user?.permissions.includes("platform.configure"));
  const canRead =
    canManage || Boolean(user?.permissions.includes("mrl.read"));
  return (
    <MrlWorkspace
      key={scope}
      scope={scope}
      canManage={canManage}
      canRead={canRead}
    />
  );
}

function MrlWorkspace({
  scope,
  canManage,
  canRead,
}: {
  scope: string;
  canManage: boolean;
  canRead: boolean;
}) {
  const workspace = useMrlWorkspace(scope, canManage, canRead);
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

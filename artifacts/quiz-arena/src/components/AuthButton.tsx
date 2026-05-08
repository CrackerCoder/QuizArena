import { LogIn, LogOut, User, Cloud, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { sfx } from "@/lib/sound";

export function AuthButton() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const t = useT();

  if (isLoading) return null;

  if (isAuthenticated && user) {
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("profile")} className="relative">
            {user.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={displayName}
                className="h-7 w-7 rounded-full object-cover ring-1 ring-primary/30"
              />
            ) : (
              <User className="h-5 w-5" />
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 ring-1 ring-background" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium truncate">{displayName}</p>
            {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 text-xs text-muted-foreground pointer-events-none">
            <Cloud className="h-3.5 w-3.5 text-green-500" />
            {t("syncedToCloud")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-destructive"
            onClick={() => { sfx.click(); logout(); }}
          >
            <LogOut className="h-4 w-4" />
            {t("signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      id="tutorial-signin"
      variant="ghost"
      size="icon"
      aria-label={t("signIn")}
      onClick={() => { sfx.click(); login(); }}
      title={t("localOnly")}
    >
      <HardDrive className="h-5 w-5 text-muted-foreground" />
    </Button>
  );
}

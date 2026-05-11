import 'package:flutter/material.dart';

import '../core/design_tokens.dart';

class ControlShellPage extends StatelessWidget {
  const ControlShellPage({
    super.key,
    required this.title,
    required this.child,
    required this.currentRoute,
    this.actions,
    required this.onNavigate,
    required this.onLogout,
  });

  final String title;
  final Widget child;
  final String currentRoute;
  final List<Widget>? actions;
  final ValueChanged<String> onNavigate;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width >= 1024;
    if (!isDesktop) {
      return Scaffold(
        appBar: AppBar(title: Text(title), actions: actions),
        drawer: Drawer(
          child: _ShellNav(
            currentRoute: currentRoute,
            onNavigate: onNavigate,
            onLogout: onLogout,
          ),
        ),
        body: child,
      );
    }

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: AppGradients.topAura,
        ),
        child: Row(
          children: [
            Container(
              width: 260,
              margin: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: AppColors.surfaceBase,
                borderRadius: AppRadii.lg,
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: _ShellNav(
                currentRoute: currentRoute,
                onNavigate: onNavigate,
                onLogout: onLogout,
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(0, AppSpacing.lg, AppSpacing.lg, AppSpacing.lg),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceBase,
                        borderRadius: AppRadii.lg,
                        border: Border.all(color: AppColors.borderSubtle),
                      ),
                      child: Row(
                        children: [
                          Text(title, style: Theme.of(context).textTheme.titleLarge),
                          const Spacer(),
                          ...?actions,
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: AppRadii.lg,
                        child: Container(
                          decoration: BoxDecoration(
                            color: AppColors.surfaceBase,
                            border: Border.all(color: AppColors.borderSubtle),
                          ),
                          child: child,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ShellNav extends StatelessWidget {
  const _ShellNav({
    required this.currentRoute,
    required this.onNavigate,
    required this.onLogout,
  });

  final String currentRoute;
  final ValueChanged<String> onNavigate;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.md),
              child: Text('Control Hub', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            ),
            _NavButton(
              icon: Icons.grid_view_rounded,
              label: 'Dispositivos',
              selected: currentRoute == '/',
              onTap: () => onNavigate('/'),
            ),
            _NavButton(
              icon: Icons.history,
              label: 'Runs globales',
              selected: currentRoute == '/runs',
              onTap: () => onNavigate('/runs'),
            ),
            _NavButton(
              icon: Icons.settings,
              label: 'Configuracion',
              selected: currentRoute == '/settings',
              onTap: () => onNavigate('/settings'),
            ),
            const Spacer(),
            _NavButton(
              icon: Icons.logout,
              label: 'Cerrar sesion',
              selected: false,
              onTap: onLogout,
            ),
          ],
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final selectedColor = Theme.of(context).colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadii.md,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.md),
          decoration: BoxDecoration(
            borderRadius: AppRadii.md,
            color: selected ? selectedColor.withValues(alpha: 0.15) : Colors.transparent,
            border: Border.all(color: selected ? selectedColor.withValues(alpha: 0.35) : Colors.transparent),
          ),
          child: Row(
            children: [
              Icon(icon, size: 20, color: selected ? selectedColor : Theme.of(context).colorScheme.onSurface),
              const SizedBox(width: AppSpacing.sm),
              Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: selected ? selectedColor : null)),
            ],
          ),
        ),
      ),
    );
  }
}

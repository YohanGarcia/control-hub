import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../shared/app_snackbar.dart';
import '../devices/device_service.dart';
import '../devices/enrollment_models.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  final _controller = TextEditingController();
  final _inviteTokenCtrl = TextEditingController();
  List<OrganizationItem> _organizations = <OrganizationItem>[];
  int? _selectedOrganizationId;
  List<OrganizationInviteItem> _invites = <OrganizationInviteItem>[];
  bool _loadingInvites = false;
  String _inviteRole = 'viewer';
  List<AuditEventItem> _auditEvents = <AuditEventItem>[];
  bool _loadingAudit = false;
  String _auditTypeFilter = 'all';
  String _auditRange = '7d';
  int _auditVisible = 20;

  DeviceService get _deviceService => ref.read(deviceServiceProvider);

  @override
  void initState() {
    super.initState();
    final current = ref.read(appSettingsProvider).apiBaseUrl;
    _controller.text = current;
    unawaited(_loadOrganizationsAndInvites());
  }

  @override
  void dispose() {
    _controller.dispose();
    _inviteTokenCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadOrganizationsAndInvites() async {
    final orgs = await _deviceService.fetchOrganizations();
    if (!mounted) return;
    final session = ref.read(sessionStoreProvider);
    int? selected = session.selectedOrganizationId;
    if (selected == null || !orgs.any((o) => o.id == selected)) {
      selected = orgs.isEmpty ? null : orgs.first.id;
      await session.saveSelectedOrganizationId(selected);
    }
    setState(() {
      _organizations = orgs;
      _selectedOrganizationId = selected;
    });
    await _loadInvites();
    unawaited(_loadAudit());
  }

  Future<void> _loadInvites() async {
    final orgId = _selectedOrganizationId;
    if (orgId == null) return;
    setState(() => _loadingInvites = true);
    try {
      final invites = await _deviceService.fetchOrganizationInvites(organizationId: orgId);
      if (!mounted) return;
      setState(() => _invites = invites);
    } finally {
      if (mounted) setState(() => _loadingInvites = false);
    }
  }

  Future<void> _loadAudit() async {
    setState(() => _loadingAudit = true);
    try {
      final rows = await _deviceService.fetchAuditEvents(offset: 0, limit: 200);
      if (!mounted) return;
      setState(() {
        _auditEvents = rows;
        _auditVisible = 20;
      });
    } finally {
      if (mounted) setState(() => _loadingAudit = false);
    }
  }

  List<AuditEventItem> get _filteredAuditEvents {
    final now = DateTime.now();
    DateTime? from;
    if (_auditRange == '7d') from = now.subtract(const Duration(days: 7));
    if (_auditRange == '30d') from = now.subtract(const Duration(days: 30));
    return _auditEvents.where((e) {
      if (_auditTypeFilter != 'all' && !e.eventType.startsWith(_auditTypeFilter)) return false;
      if (from != null && e.createdAt.isBefore(from)) return false;
      return true;
    }).toList();
  }

  Future<void> _createInvite() async {
    final orgId = _selectedOrganizationId;
    if (orgId == null) return;
    final created = await _deviceService.createOrganizationInvite(
      organizationId: orgId,
      role: _inviteRole,
      expiresInSeconds: 86400,
    );
    await Clipboard.setData(ClipboardData(text: created.token));
    if (!mounted) return;
    AppSnackbar.success(context, 'Invitacion creada y copiada');
    await _loadInvites();
  }

  Future<void> _acceptInvite() async {
    final token = _inviteTokenCtrl.text.trim();
    if (token.isEmpty) {
      AppSnackbar.error(context, 'Pega un token de invitacion');
      return;
    }
    await _deviceService.acceptOrganizationInvite(token: token);
    _inviteTokenCtrl.clear();
    if (!mounted) return;
    AppSnackbar.success(context, 'Invitacion aceptada');
    await _loadOrganizationsAndInvites();
  }

  Future<void> _save() async {
    final value = _controller.text.trim();
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      AppSnackbar.error(context, 'La URL debe iniciar con http:// o https://');
      return;
    }
    await ref.read(appSettingsProvider.notifier).setApiBaseUrl(value);
    if (!mounted) return;
    AppSnackbar.success(context, 'API base actualizada');
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Configuracion')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('API Base URL', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          TextField(
            controller: _controller,
            decoration: const InputDecoration(labelText: 'Ej: http://127.0.0.1:8001/api/v1'),
          ),
          const SizedBox(height: 16),
          FilledButton(onPressed: _save, child: const Text('Guardar y volver')),
          const SizedBox(height: 8),
          FilledButton.tonalIcon(
            onPressed: () => context.push('/team'),
            icon: const Icon(Icons.groups_rounded),
            label: const Text('Gestionar equipo'),
          ),
          const SizedBox(height: 8),
          const Text('Despues de guardar, vuelve a iniciar sesion si ya habia sesiones abiertas.'),
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 12),
          const Text('Organizacion activa', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          if (_organizations.isEmpty)
            const Text('Sin organizaciones disponibles')
          else
            DropdownButtonFormField<int>(
              initialValue: _selectedOrganizationId ?? _organizations.first.id,
              items: _organizations
                  .map((o) => DropdownMenuItem<int>(value: o.id, child: Text('${o.name} (${o.slug})')))
                  .toList(),
              onChanged: (v) async {
                if (v == null) return;
                await ref.read(sessionStoreProvider).saveSelectedOrganizationId(v);
                if (!mounted) return;
                setState(() => _selectedOrganizationId = v);
                await _loadInvites();
              },
            ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _inviteRole,
                  decoration: const InputDecoration(labelText: 'Rol de invitacion'),
                  items: const [
                    DropdownMenuItem(value: 'viewer', child: Text('viewer')),
                    DropdownMenuItem(value: 'operator', child: Text('operator')),
                    DropdownMenuItem(value: 'admin', child: Text('admin')),
                  ],
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() => _inviteRole = v);
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: _selectedOrganizationId == null ? null : _createInvite,
                  icon: const Icon(Icons.person_add_alt_1_rounded),
                  label: const Text('Crear invitacion'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _inviteTokenCtrl,
            decoration: const InputDecoration(
              labelText: 'Token de invitacion',
              hintText: 'invite_xxx...',
            ),
          ),
          const SizedBox(height: 8),
          FilledButton.tonal(onPressed: _acceptInvite, child: const Text('Aceptar invitacion')),
          const SizedBox(height: 16),
          const Text('Invitaciones recientes', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          if (_loadingInvites)
            const CircularProgressIndicator(strokeWidth: 2)
          else if (_invites.isEmpty)
            const Text('No hay invitaciones')
          else
            ..._invites.take(8).map(
              (inv) => ListTile(
                contentPadding: EdgeInsets.zero,
                dense: true,
                title: Text('Invite #${inv.id} · rol ${inv.role}'),
                subtitle: Text(inv.isUsed ? 'Usada' : 'Expira: ${inv.expiresAt.toLocal().toIso8601String().substring(0, 19)}'),
                trailing: inv.isUsed
                    ? const Icon(Icons.lock_clock_outlined, size: 18)
                    : IconButton(
                        tooltip: 'Revocar',
                        onPressed: () async {
                          final orgId = _selectedOrganizationId;
                          if (orgId == null) return;
                          await _deviceService.revokeOrganizationInvite(organizationId: orgId, inviteId: inv.id);
                          if (!mounted) return;
                          AppSnackbar.success(this.context, 'Invitacion revocada');
                          await _loadInvites();
                        },
                        icon: const Icon(Icons.delete_outline_rounded, size: 18),
                      ),
              ),
            ),
          const SizedBox(height: 20),
          const Divider(),
          const SizedBox(height: 10),
          const Text('Historial', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _auditTypeFilter,
                  decoration: const InputDecoration(labelText: 'Tipo evento'),
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('todos')),
                    DropdownMenuItem(value: 'organization', child: Text('organization.*')),
                    DropdownMenuItem(value: 'invite', child: Text('invite.*')),
                    DropdownMenuItem(value: 'enrollment', child: Text('enrollment.*')),
                    DropdownMenuItem(value: 'device', child: Text('device.*')),
                    DropdownMenuItem(value: 'action', child: Text('action.*')),
                  ],
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() {
                      _auditTypeFilter = v;
                      _auditVisible = 20;
                    });
                  },
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _auditRange,
                  decoration: const InputDecoration(labelText: 'Rango'),
                  items: const [
                    DropdownMenuItem(value: '7d', child: Text('7 dias')),
                    DropdownMenuItem(value: '30d', child: Text('30 dias')),
                    DropdownMenuItem(value: 'all', child: Text('Todo')),
                  ],
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() {
                      _auditRange = v;
                      _auditVisible = 20;
                    });
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_loadingAudit)
            const CircularProgressIndicator(strokeWidth: 2)
          else if (_filteredAuditEvents.isEmpty)
            const Text('Sin eventos para los filtros seleccionados')
          else
            ..._filteredAuditEvents.take(_auditVisible).map(
              (e) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.history_rounded, size: 18),
                title: Text(e.eventType),
                subtitle: Text('${e.createdAt.toLocal().toIso8601String().substring(0, 19)} · ${e.targetType ?? '-'}:${e.targetId ?? '-'}'),
              ),
            ),
          if (!_loadingAudit && _filteredAuditEvents.length > _auditVisible)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Align(
                alignment: Alignment.centerLeft,
                child: OutlinedButton.icon(
                  onPressed: () => setState(() => _auditVisible += 20),
                  icon: const Icon(Icons.expand_more_rounded),
                  label: const Text('Cargar mas'),
                ),
              ),
            ),
          const SizedBox(height: 14),
          const Text('Historial planificado', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          const _HistoryPlanItem(
            title: 'Fase 1 completada',
            subtitle: 'Multi-tenant base, organizaciones y membresias activas.',
            done: true,
          ),
          const _HistoryPlanItem(
            title: 'Fase 2 completada',
            subtitle: 'Enrollment token para alta de agentes sin key manual.',
            done: true,
          ),
          const _HistoryPlanItem(
            title: 'Fase 3 en progreso',
            subtitle: 'Invitaciones y gestion de miembros desde UI.',
            done: false,
          ),
          const _HistoryPlanItem(
            title: 'Fase 4 pendiente',
            subtitle: 'Instalador agente productivo (Windows/Linux) y monitoreo.',
            done: false,
          ),
        ],
      ),
    );
  }
}

class _HistoryPlanItem extends StatelessWidget {
  const _HistoryPlanItem({required this.title, required this.subtitle, required this.done});

  final String title;
  final String subtitle;
  final bool done;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(done ? Icons.check_circle_rounded : Icons.schedule_rounded, color: done ? Colors.green : Colors.orange),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(subtitle),
    );
  }
}

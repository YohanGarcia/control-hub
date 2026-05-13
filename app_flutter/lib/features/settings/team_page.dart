import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../shared/app_snackbar.dart';
import '../devices/device_service.dart';
import '../devices/enrollment_models.dart';

class TeamPage extends ConsumerStatefulWidget {
  const TeamPage({super.key});

  @override
  ConsumerState<TeamPage> createState() => _TeamPageState();
}

class _TeamPageState extends ConsumerState<TeamPage> {
  List<OrganizationItem> _orgs = <OrganizationItem>[];
  List<OrganizationMembershipItem> _memberships = <OrganizationMembershipItem>[];
  int? _orgId;
  List<OrganizationMemberItem> _members = <OrganizationMemberItem>[];
  bool _loading = true;

  DeviceService get _service => ref.read(deviceServiceProvider);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final orgs = await _service.fetchOrganizations();
    final memberships = await _service.fetchOrganizationMemberships();
    final session = ref.read(sessionStoreProvider);
    var selected = session.selectedOrganizationId;
    if (selected == null || !orgs.any((o) => o.id == selected)) {
      selected = orgs.isEmpty ? null : orgs.first.id;
      await session.saveSelectedOrganizationId(selected);
    }
    List<OrganizationMemberItem> members = <OrganizationMemberItem>[];
    if (selected != null) {
      members = await _service.fetchOrganizationMembers(organizationId: selected);
    }
    if (!mounted) return;
    setState(() {
      _orgs = orgs;
      _memberships = memberships;
      _orgId = selected;
      _members = members;
      _loading = false;
    });
  }

  String get _myRole {
    final orgId = _orgId;
    if (orgId == null) return 'viewer';
    final found = _memberships.where((m) => m.organizationId == orgId);
    return found.isEmpty ? 'viewer' : found.first.role;
  }

  Future<void> _changeRole(OrganizationMemberItem member, String role) async {
    final orgId = _orgId;
    if (orgId == null) return;
    await _service.updateOrganizationMemberRole(organizationId: orgId, userId: member.userId, role: role);
    if (!mounted) return;
    AppSnackbar.success(context, 'Rol actualizado');
    await _load();
  }

  Future<void> _removeMember(OrganizationMemberItem member) async {
    final orgId = _orgId;
    if (orgId == null) return;
    await _service.removeOrganizationMember(organizationId: orgId, userId: member.userId);
    if (!mounted) return;
    AppSnackbar.success(context, 'Miembro removido');
    await _load();
  }

  Future<void> _confirmRemoveMember(OrganizationMemberItem member) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remover miembro'),
        content: Text('Se removera a ${member.email} del equipo. Esta accion puede revertirse invitandolo de nuevo.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancelar')),
          FilledButton.tonal(onPressed: () => Navigator.of(context).pop(true), child: const Text('Remover')),
        ],
      ),
    );
    if (ok == true) {
      await _removeMember(member);
    }
  }

  Color _roleColor(String role) {
    switch (role) {
      case 'owner':
        return const Color(0xFF7C3AED);
      case 'admin':
        return const Color(0xFF2563EB);
      case 'operator':
        return const Color(0xFF0E9F6E);
      default:
        return const Color(0xFF6B7280);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Equipo')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_orgs.isNotEmpty)
                  DropdownButtonFormField<int>(
                    initialValue: _orgId ?? _orgs.first.id,
                    decoration: const InputDecoration(labelText: 'Organizacion'),
                    items: _orgs
                        .map((o) => DropdownMenuItem<int>(value: o.id, child: Text('${o.name} (${o.slug})')))
                        .toList(),
                    onChanged: (v) async {
                      if (v == null) return;
                      await ref.read(sessionStoreProvider).saveSelectedOrganizationId(v);
                      if (!mounted) return;
                      setState(() => _orgId = v);
                      await _load();
                    },
                  ),
                const SizedBox(height: 16),
                Text('Tu rol actual: $_myRole', style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                const Text('Miembros', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                if (_members.isEmpty)
                  const Text('No hay miembros')
                else
                  ..._members.map(
                    (m) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(m.fullName?.isNotEmpty == true ? m.fullName! : m.email),
                      subtitle: Text('${m.email} · ${m.status}'),
                      leading: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _roleColor(m.role).withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(m.role, style: TextStyle(color: _roleColor(m.role), fontSize: 10.5, fontWeight: FontWeight.w700)),
                      ),
                      trailing: SizedBox(
                        width: 220,
                        child: Row(
                          children: [
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                initialValue: m.role,
                                isDense: true,
                                decoration: const InputDecoration(isDense: true),
                                items: const [
                                  DropdownMenuItem(value: 'viewer', child: Text('viewer')),
                                  DropdownMenuItem(value: 'operator', child: Text('operator')),
                                  DropdownMenuItem(value: 'admin', child: Text('admin')),
                                  DropdownMenuItem(value: 'owner', child: Text('owner')),
                                ],
                                onChanged: (_myRole == 'owner' || _myRole == 'admin')
                                    ? (v) {
                                        if (v == null || v == m.role) return;
                                        if (_myRole != 'owner' && m.role == 'owner') return;
                                        _changeRole(m, v);
                                      }
                                    : null,
                              ),
                            ),
                            const SizedBox(width: 6),
                            IconButton(
                              tooltip: 'Remover',
                              onPressed: (_myRole == 'owner' || _myRole == 'admin') && m.role != 'owner'
                                  ? () => _confirmRemoveMember(m)
                                  : null,
                              icon: const Icon(Icons.person_remove_rounded, size: 18),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}

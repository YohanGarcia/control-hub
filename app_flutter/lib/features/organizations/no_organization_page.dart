import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';

class NoOrganizationPage extends ConsumerStatefulWidget {
  const NoOrganizationPage({super.key});

  @override
  ConsumerState<NoOrganizationPage> createState() => _NoOrganizationPageState();
}

class _NoOrganizationPageState extends ConsumerState<NoOrganizationPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _slugCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _slugCtrl.dispose();
    super.dispose();
  }

  String _slugify(String input) {
    return input
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9\s-]'), '')
        .replaceAll(RegExp(r'\s+'), '-')
        .replaceAll(RegExp(r'-+'), '-')
        .replaceAll(RegExp(r'^-|-$'), '');
  }

  void _onNameChanged(String value) {
    final slug = _slugify(value);
    if (_slugCtrl.text.isEmpty || _slugCtrl.text == _slugify(_nameCtrl.text.substring(0, _nameCtrl.text.length - 1))) {
      _slugCtrl.value = TextEditingValue(text: slug, selection: TextSelection.collapsed(offset: slug.length));
    }
  }

  Future<void> _createOrg() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    try {
      final service = ref.read(deviceServiceProvider);
      final org = await service.createOrganization(
        name: _nameCtrl.text.trim(),
        slug: _slugCtrl.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Organizacion "${org.name}" creada')),
      );
      context.go('/');
    } catch (e) {
      if (!mounted) return;
      setState(() { _loading = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(context).colorScheme.primary.withValues(alpha: 0.08),
              Theme.of(context).colorScheme.secondary.withValues(alpha: 0.05),
            ],
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Card(
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 32, 24, 28),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(Icons.business, color: Theme.of(context).colorScheme.primary, size: 28),
                          ),
                          const SizedBox(width: 14),
                          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('Sin organizacion', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
                            Text('Crea una para continuar', style: Theme.of(context).textTheme.bodySmall),
                          ]),
                        ]),
                        const SizedBox(height: 28),
                        Text('Nombre de la organizacion', style: TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _nameCtrl,
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.business_outlined),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            hintText: 'Mi Empresa',
                          ),
                          onChanged: _onNameChanged,
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Ingresa el nombre' : null,
                        ),
                        const SizedBox(height: 16),
                        Text('Slug (URL)', style: TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _slugCtrl,
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.link),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            hintText: 'mi-empresa',
                          ),
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) return 'Ingresa el slug';
                            if (!RegExp(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$').hasMatch(v.trim())) {
                              return 'Solo letras minusculas, numeros y guiones';
                            }
                            return null;
                          },
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.red.withValues(alpha: 0.2)),
                            ),
                            child: Row(children: [
                              const Icon(Icons.error_outline, color: Colors.red, size: 20),
                              const SizedBox(width: 8),
                              Expanded(child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13))),
                            ]),
                          ),
                        ],
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: FilledButton(
                            onPressed: _loading ? null : _createOrg,
                            child: _loading
                                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Text('Crear organizacion', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

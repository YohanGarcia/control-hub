enum TerminalSuggestionSource { prefix, history, heuristic }

class TerminalSuggestion {
  TerminalSuggestion({
    required this.label,
    required this.command,
    required this.reason,
    required this.source,
  });

  final String label;
  final String command;
  final String reason;
  final TerminalSuggestionSource source;
}

class TerminalSuggestionService {
  List<TerminalSuggestion> suggestions({
    required String hostType,
    required String input,
    required List<String> history,
    required Map<String, int> usageByCommand,
    required String recentOutput,
    required String recentError,
    int maxItems = 5,
  }) {
    final merged = <TerminalSuggestion>[];
    merged.addAll(_historySuggestions(input: input, history: history, usageByCommand: usageByCommand));
    merged.addAll(_heuristicSuggestions(hostType: hostType, output: recentOutput, error: recentError, input: input));
    merged.addAll(_prefixSuggestions(hostType: hostType, input: input));

    final seen = <String>{};
    final dedup = <TerminalSuggestion>[];
    for (final item in merged) {
      final key = item.command.trim().toLowerCase();
      if (key.isEmpty || seen.contains(key)) continue;
      seen.add(key);
      dedup.add(item);
      if (dedup.length >= maxItems) break;
    }
    return dedup;
  }

  List<TerminalSuggestion> _prefixSuggestions({required String hostType, required String input}) {
    final q = input.trim().toLowerCase();
    final base = _baseCommands(hostType);
    final matches = q.isEmpty
        ? base.take(5)
        : base.where((c) => c.toLowerCase().startsWith(q));
    return matches
        .map(
          (c) => TerminalSuggestion(
            label: c,
            command: c,
            reason: 'Base del sistema',
            source: TerminalSuggestionSource.prefix,
          ),
        )
        .toList();
  }

  List<TerminalSuggestion> _historySuggestions({
    required String input,
    required List<String> history,
    required Map<String, int> usageByCommand,
  }) {
    final q = input.trim().toLowerCase();
    final indexed = <_HistoryCandidate>[];
    for (var i = 0; i < history.length; i++) {
      final cmd = history[i];
      if (q.isNotEmpty && !cmd.toLowerCase().startsWith(q)) continue;
      final usage = usageByCommand[cmd] ?? 0;
      indexed.add(_HistoryCandidate(command: cmd, usage: usage, recencyIndex: i));
    }

    indexed.sort((a, b) {
      final byUsage = b.usage.compareTo(a.usage);
      if (byUsage != 0) return byUsage;
      return b.recencyIndex.compareTo(a.recencyIndex);
    });

    final out = <TerminalSuggestion>[];
    for (final item in indexed.take(5)) {
      out.add(
        TerminalSuggestion(
          label: item.command,
          command: item.command,
          reason: item.usage > 0 ? 'Historial (usado ${item.usage}x)' : 'Historial',
          source: TerminalSuggestionSource.history,
        ),
      );
    }
    return out;
  }

  List<TerminalSuggestion> _heuristicSuggestions({
    required String hostType,
    required String output,
    required String error,
    required String input,
  }) {
    final text = '${output.toLowerCase()}\n${error.toLowerCase()}';
    final suggestions = <TerminalSuggestion>[];

    if (text.contains('not recognized') || text.contains('no se reconoce')) {
      suggestions.add(
        TerminalSuggestion(
          label: hostType == 'windows' ? 'where <cmd>' : 'which <cmd>',
          command: hostType == 'windows' ? 'where ' : 'which ',
          reason: 'Comando no encontrado',
          source: TerminalSuggestionSource.heuristic,
        ),
      );
    }
    if (text.contains('permission denied') || text.contains('access is denied')) {
      suggestions.add(
        TerminalSuggestion(
          label: hostType == 'windows' ? 'whoami /groups' : 'id',
          command: hostType == 'windows' ? 'whoami /groups' : 'id',
          reason: 'Permisos',
          source: TerminalSuggestionSource.heuristic,
        ),
      );
    }
    if (text.contains('no such file or directory')) {
      suggestions.add(
        TerminalSuggestion(
          label: hostType == 'windows' ? 'dir' : 'ls -la',
          command: hostType == 'windows' ? 'dir' : 'ls -la',
          reason: 'Ruta inválida',
          source: TerminalSuggestionSource.heuristic,
        ),
      );
      suggestions.add(
        TerminalSuggestion(
          label: 'pwd',
          command: hostType == 'windows' ? 'cd' : 'pwd',
          reason: 'Ver ruta actual',
          source: TerminalSuggestionSource.heuristic,
        ),
      );
    }

    if (input.trim().isEmpty && suggestions.isEmpty) {
      suggestions.add(
        TerminalSuggestion(
          label: hostType == 'windows' ? 'dir' : 'ls -la',
          command: hostType == 'windows' ? 'dir' : 'ls -la',
          reason: 'Sugerencia inicial',
          source: TerminalSuggestionSource.heuristic,
        ),
      );
    }

    return suggestions;
  }

  List<String> _baseCommands(String hostType) {
    if (hostType == 'windows') {
      return const [
        'dir',
        'cd',
        'where',
        'ipconfig',
        'whoami',
        'Get-Process',
        'Get-Service',
        'tasklist',
      ];
    }
    return const [
      'ls -la',
      'cd',
      'which',
      'ip a',
      'whoami',
      'ps aux',
      'systemctl status',
      'df -h',
      'pwd',
    ];
  }
}

class _HistoryCandidate {
  _HistoryCandidate({required this.command, required this.usage, required this.recencyIndex});

  final String command;
  final int usage;
  final int recencyIndex;
}

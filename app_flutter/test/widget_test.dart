import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:control_hub_app/app.dart';

void main() {
  testWidgets('App renders login shell via router', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: ControlHubApp()));
    await tester.pump();
    expect(find.byType(Scaffold), findsWidgets);
  });
}

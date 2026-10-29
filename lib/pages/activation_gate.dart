import 'package:flutter/material.dart';
import 'package:videogame/pages/main_page.dart';
import 'package:videogame/services/license_service.dart';

import 'activation_page.dart';

class ActivationGate extends StatefulWidget {
  const ActivationGate({Key? key}) : super(key: key);

  @override
  State<ActivationGate> createState() => _ActivationGateState();
}

class _ActivationGateState extends State<ActivationGate> {
  late Future<bool> _activationCheck;

  @override
  void initState() {
    super.initState();
    _activationCheck = LicenseService.isActivated();
  }

  void _onActivated() {
    setState(() {
      _activationCheck = Future.value(true);
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: _activationCheck,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Scaffold(
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('No se pudo comprobar el estado de activación.'),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () {
                      setState(() {
                        _activationCheck = LicenseService.isActivated();
                      });
                    },
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            ),
          );
        }
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (snapshot.data == true) {
          return MainPage();
        }
        return ActivationPage(onActivated: _onActivated);
      },
    );
  }
}

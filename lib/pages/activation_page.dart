import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class ActivationPage extends StatefulWidget {
  const ActivationPage({Key? key}) : super(key: key);

  @override
  State<ActivationPage> createState() => _ActivationPageState();
}

class _ActivationPageState extends State<ActivationPage> {
  final TextEditingController _codeController = TextEditingController();
  String? _message;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _pasteCode() async {
    final clipboardData = await Clipboard.getData(Clipboard.kTextPlain);
    if (clipboardData?.text == null) {
      return;
    }

    _codeController
      ..text = clipboardData!.text!
      ..selection = TextSelection.collapsed(offset: clipboardData.text!.length);
  }

  void _activate() {
    setState(() {
      _message = _codeController.text.trim().isEmpty
          ? 'Pega tu código de activación para continuar.'
          : 'La validación de claves estará disponible cuando conectemos Supabase.';
    });
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async => false,
      child: Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Icon(Icons.videogame_asset_rounded, size: 64),
                    const SizedBox(height: 24),
                    const Text(
                      'Pega aquí tu código de activación',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _codeController,
                      autocorrect: false,
                      enableSuggestions: false,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: 'Código de activación',
                        border: const OutlineInputBorder(),
                        suffixIcon: IconButton(
                          tooltip: 'Pegar código',
                          onPressed: _pasteCode,
                          icon: const Icon(Icons.content_paste),
                        ),
                      ),
                      onChanged: (_) {
                        if (_message != null) {
                          setState(() => _message = null);
                        }
                      },
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _activate,
                      child: const Text('Activar'),
                    ),
                    if (_message != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        _message!,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: _codeController.text.trim().isEmpty
                              ? Theme.of(context).colorScheme.error
                              : Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

import SwiftUI
import PDFKit

struct PDFViewerView: View {
    let subject: GeneratedSubject
    @State private var pdfDocument: PDFDocument?
    @State private var isLoading = true
    @State private var error: String?
    @State private var showShareSheet = false
    @State private var pdfData: Data?

    var body: some View {
        ZStack {
            if isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                        .tint(.brevBlue)
                        .scaleEffect(1.4)
                    Text("Chargement du PDF...")
                        .foregroundColor(.secondary)
                }
            } else if let doc = pdfDocument {
                PDFKitView(document: doc)
                    .ignoresSafeArea(edges: .bottom)
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 48))
                        .foregroundColor(.orange)
                    Text(error ?? "PDF indisponible.")
                        .multilineTextAlignment(.center)
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 32)
                }
            }
        }
        .navigationTitle(subject.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if pdfData != nil {
                    Button {
                        showShareSheet = true
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            }
        }
        .sheet(isPresented: $showShareSheet) {
            if let data = pdfData {
                ShareSheet(items: [data])
            }
        }
        .task { await loadPDF() }
    }

    private func loadPDF() async {
        guard let urlString = subject.pdfUrl, let url = URL(string: urlString) else {
            error = "URL du PDF manquante."
            isLoading = false
            return
        }

        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            pdfData = data
            pdfDocument = PDFDocument(data: data)
            if pdfDocument == nil {
                error = "Impossible de lire le PDF."
            }
        } catch {
            self.error = "Téléchargement impossible : \(error.localizedDescription)"
        }
        isLoading = false
    }
}

// MARK: - PDFKit UIViewRepresentable

struct PDFKitView: UIViewRepresentable {
    let document: PDFDocument

    func makeUIView(context: Context) -> PDFView {
        let pdfView = PDFView()
        pdfView.autoScales = true
        pdfView.displayMode = .singlePageContinuous
        pdfView.displayDirection = .vertical
        pdfView.usePageViewController(false)
        pdfView.pageBreakMargins = UIEdgeInsets(top: 8, left: 8, bottom: 8, right: 8)
        pdfView.document = document
        return pdfView
    }

    func updateUIView(_ uiView: PDFView, context: Context) {
        uiView.document = document
    }
}

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

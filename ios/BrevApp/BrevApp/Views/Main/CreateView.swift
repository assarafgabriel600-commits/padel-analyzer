import SwiftUI

struct CreateView: View {
    @EnvironmentObject var subjectsVM: SubjectsViewModel
    @StateObject private var chatVM = ChatViewModel()
    @State private var showPDFViewer = false
    @State private var generatedSubjectForViewer: GeneratedSubject?

    var body: some View {
        NavigationStack {
            ChatView(chatVM: chatVM, onPDFReady: { payload in
                // Add to recent subjects and offer to view
                Task {
                    await subjectsVM.load()
                    if let subject = subjectsVM.subjects.first(where: { $0.id == payload.subjectId }) {
                        generatedSubjectForViewer = subject
                        showPDFViewer = true
                    }
                }
            })
            .navigationTitle("Créer un sujet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        chatVM.reset()
                    } label: {
                        Image(systemName: "arrow.counterclockwise")
                    }
                    .disabled(chatVM.messages.count <= 1)
                }
            }
            .navigationDestination(isPresented: $showPDFViewer) {
                if let subject = generatedSubjectForViewer {
                    PDFViewerView(subject: subject)
                }
            }
        }
    }
}

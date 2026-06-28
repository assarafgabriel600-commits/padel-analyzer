import Foundation

struct GeneratedSubject: Identifiable, Codable {
    let id: String
    let title: String
    let pdfUrl: String?
    let subjects: [String]?
    let themes: [String]?
    let userPrompt: String
    let createdAt: Date
    let exerciseCount: Int?

    var subjectLabel: String {
        (subjects ?? []).map { subjectDisplayName($0) }.joined(separator: ", ")
    }

    var themesLabel: String {
        (themes ?? []).prefix(2).joined(separator: " · ")
    }

    var formattedDate: String {
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "fr_FR")
        fmt.dateStyle = .medium
        return fmt.string(from: createdAt)
    }

    enum CodingKeys: String, CodingKey {
        case id, title, subjects, themes
        case pdfUrl = "pdf_url"
        case userPrompt = "user_prompt"
        case createdAt = "created_at"
        case exerciseCount = "exercise_count"
    }
}

func subjectDisplayName(_ code: String) -> String {
    switch code {
    case "histoire_geo_emc": return "Histoire-Géo-EMC"
    case "maths": return "Maths"
    case "francais": return "Français"
    case "sciences": return "Sciences"
    default: return code
    }
}

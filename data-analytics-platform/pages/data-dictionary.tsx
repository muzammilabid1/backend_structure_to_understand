import { useState } from 'react'
import { Search, Book, ChevronDown, ChevronUp, Database, Calculator, Clock, Users, Activity, Video, BookOpen, BarChart3, Star, Camera, GitBranch } from 'lucide-react'
import styles from '../styles/DataDictionary.module.scss'

interface Metric {
  id: string
  name: string
  description: string
  calculation: string
  dataSources: string[]
  refreshRate: string
  category: string
}

const METRICS: Metric[] = [
  // Core Activity Metrics
  {
    id: 'pupils-active-all',
    name: 'Pupils Active (All)',
    description: 'Pupils who have completed an activity or recorded a reading session during the time period',
    calculation: 'Count of distinct pupils who either completed an activity (left comment, photo, or rating) OR recorded a reading session',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_history', 'lwp_pupil_activity', 'lwp_pupil_topic', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Population'
  },
  {
    id: 'pupils-active-pp',
    name: 'Pupils Active (Pupil Premium)',
    description: 'Pupil Premium pupils who have completed an activity or recorded a reading session during the time period',
    calculation: 'Count of distinct Pupil Premium pupils who either completed an activity (left comment, photo, or rating) OR recorded a reading session',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_history', 'lwp_pupil_activity', 'lwp_pupil_topic', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Population'
  },
  {
    id: 'parents-registered-all',
    name: 'Parents Registered (All)',
    description: 'All parents who have registered on the platform (cumulative total)',
    calculation: 'Count of all distinct parent users who have registered, regardless of activity level',
    dataSources: ['lwp_user', 'lwp_pupil_parent', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Population'
  },
  {
    id: 'parents-registered-pp',
    name: 'Parents Registered (Pupil Premium)',
    description: 'All parents with at least one Pupil Premium child who have registered on the platform (cumulative total)',
    calculation: 'Count of distinct parent users who have registered and have at least one Pupil Premium child',
    dataSources: ['lwp_user', 'lwp_pupil_parent', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Population'
  },
  {
    id: 'percentage-pp',
    name: 'Percentage of Pupil Premium',
    description: 'Percentage of active pupils who are classified as Pupil Premium',
    calculation: 'Count of active Pupil Premium pupils ÷ Count of all active pupils × 100',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_history', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Demographics'
  },

  // Engagement Metrics
  {
    id: 'pupils-watched-video-all',
    name: 'Pupils Who Watched Videos (All)',
    description: 'Number of pupils who watched at least one instructional video during the time period',
    calculation: 'Count of distinct pupils where watchedVideo = true in pupil topic records',
    dataSources: ['lwp_pupil_topic', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Engagement'
  },
  {
    id: 'pupils-watched-video-pp',
    name: 'Pupils Who Watched Videos (Pupil Premium)',
    description: 'Number of Pupil Premium pupils who watched at least one instructional video during the time period',
    calculation: 'Count of distinct Pupil Premium pupils where watchedVideo = true in pupil topic records',
    dataSources: ['lwp_pupil_topic', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Engagement'
  },
  {
    id: 'pupils-completed-activity-all',
    name: 'Pupils Who Completed Activities (All)',
    description: 'Number of pupils who have left at least one comment, photo, or rating for an activity',
    calculation: 'Count of distinct pupils who have activity records with rating or associated entry with comments/media',
    dataSources: ['lwp_pupil_activity', 'lwp_pupil_topic', 'lwp_pupil_feedback', 'lwp_pupil_feedback_media', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Engagement'
  },
  {
    id: 'pupils-completed-activity-pp',
    name: 'Pupils Who Completed Activities (Pupil Premium)',
    description: 'Number of Pupil Premium pupils who have left at least one comment, photo, or rating for an activity',
    calculation: 'Count of distinct Pupil Premium pupils who have activity records with rating or associated entry with comments/media',
    dataSources: ['lwp_pupil_activity', 'lwp_pupil_topic', 'lwp_pupil_feedback', 'lwp_pupil_feedback_media', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Engagement'
  },
  {
    id: 'percentage-pupils-completed-activity-all',
    name: 'Percentage of Pupils Who Completed Activities (All)',
    description: 'Percentage of all active pupils who completed at least one activity',
    calculation: 'Count of pupils who completed activities ÷ Count of all active pupils × 100',
    dataSources: ['lwp_pupil_activity', 'lwp_pupil_topic', 'lwp_pupil_feedback', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Engagement'
  },
  {
    id: 'percentage-pupils-completed-activity-pp',
    name: 'Percentage of Pupils Who Completed Activities (Pupil Premium)',
    description: 'Percentage of Pupil Premium active pupils who completed at least one activity',
    calculation: 'Count of Pupil Premium pupils who completed activities ÷ Count of active Pupil Premium pupils × 100',
    dataSources: ['lwp_pupil_activity', 'lwp_pupil_topic', 'lwp_pupil_feedback', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Engagement'
  },
  {
    id: 'pupils-recorded-reading-all',
    name: 'Pupils Who Recorded Reading (All)',
    description: 'Number of pupils who recorded at least one reading session during the time period',
    calculation: 'Count of distinct pupils with reading type entries in the entry history',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_history', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Reading'
  },
  {
    id: 'pupils-recorded-reading-pp',
    name: 'Pupils Who Recorded Reading (Pupil Premium)',
    description: 'Number of Pupil Premium pupils who recorded at least one reading session during the time period',
    calculation: 'Count of distinct Pupil Premium pupils with reading type entries in the entry history',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_history', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Reading'
  },

  // Volume Metrics
  {
    id: 'activities-completed-all',
    name: 'Number of Activities Completed (All)',
    description: 'Total instances of entries left for Maths, English, Financial literacy or Ready Teddy activities',
    calculation: 'Count of all entry instances across all activity types (multiple per pupil possible)',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_history', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Volume'
  },
  {
    id: 'activities-completed-pp',
    name: 'Number of Activities Completed (Pupil Premium)',
    description: 'Total instances of entries left for Maths, English, Financial literacy or Ready Teddy activities by Pupil Premium pupils',
    calculation: 'Count of all entry instances for Pupil Premium pupils across all activity types (multiple per pupil possible)',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_history', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Volume'
  },
  {
    id: 'comments-left-all',
    name: 'Number of Comments Left (All)',
    description: 'Total number of comments left from pupils and parents during the time period',
    calculation: 'Count of distinct entries where pupilComment, parentComment, or comment fields are not null',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_history', 'lwp_user', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Engagement'
  },
  {
    id: 'comments-left-pp',
    name: 'Number of Comments Left (Pupil Premium)',
    description: 'Total number of comments left from Pupil Premium pupils and their parents during the time period',
    calculation: 'Count of distinct entries for Pupil Premium pupils where pupilComment, parentComment, or comment fields are not null',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_history', 'lwp_user', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Engagement'
  },
  {
    id: 'photos-uploaded-all',
    name: 'Number of Photos Uploaded (All)',
    description: 'Total count of photos uploaded with entries during the time period',
    calculation: 'Count of distinct photo media records associated with entries',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_media', 'lwp_pupil_feedback_history', 'lwp_user', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Media'
  },
  {
    id: 'photos-uploaded-pp',
    name: 'Number of Photos Uploaded (Pupil Premium)',
    description: 'Total count of photos uploaded with entries for Pupil Premium pupils during the time period',
    calculation: 'Count of distinct photo media records associated with entries for Pupil Premium pupils',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_media', 'lwp_pupil_feedback_history', 'lwp_user', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Media'
  },
  {
    id: 'audio-clips-uploaded-all',
    name: 'Number of Audio Clips Uploaded (All)',
    description: 'Total count of audio clips uploaded with entries during the time period',
    calculation: 'Count of distinct audio media records associated with entries',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_media', 'lwp_pupil_feedback_history', 'lwp_user', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Media'
  },
  {
    id: 'audio-clips-uploaded-pp',
    name: 'Number of Audio Clips Uploaded (Pupil Premium)',
    description: 'Total count of audio clips uploaded with entries for Pupil Premium pupils during the time period',
    calculation: 'Count of distinct audio media records associated with entries for Pupil Premium pupils',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_media', 'lwp_pupil_feedback_history', 'lwp_user', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Media'
  },

  // Quality Metrics
  {
    id: 'average-star-rating-all',
    name: 'Average Star Rating (All)',
    description: 'Mean star rating given by parents for activities (scale 1-5) across all pupils',
    calculation: 'Sum of all activity ratings ÷ Count of all activity ratings',
    dataSources: ['lwp_pupil_activity', 'lwp_pupil_topic', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Quality'
  },
  {
    id: 'average-star-rating-pp',
    name: 'Average Star Rating (Pupil Premium)',
    description: 'Mean star rating given by parents for activities (scale 1-5) for Pupil Premium pupils',
    calculation: 'Sum of all activity ratings for Pupil Premium pupils ÷ Count of all activity ratings for Pupil Premium pupils',
    dataSources: ['lwp_pupil_activity', 'lwp_pupil_topic', 'lwp_pupil', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Quality'
  },
  {
    id: 'average-entries-per-student-all',
    name: 'Average Entries per Student (All)',
    description: 'Mean number of individual entries per student across the time period',
    calculation: 'Total entries ÷ Total unique pupils with entries',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_history', 'lwp_pupil', 'lwp_user', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Engagement'
  },
  {
    id: 'average-entries-per-student-pp',
    name: 'Average Entries per Student (Pupil Premium)',
    description: 'Mean number of individual entries per Pupil Premium student across the time period',
    calculation: 'Total entries for Pupil Premium pupils ÷ Total unique Pupil Premium pupils with entries',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_history', 'lwp_pupil', 'lwp_user', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Engagement'
  },
  {
    id: 'average-activity-entries-per-student-all',
    name: 'Average Activity Entries per Student (All)',
    description: 'Mean number of activity-specific entries per student across the time period',
    calculation: 'Total activity entries ÷ Total unique pupils with activity entries',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_history', 'lwp_pupil', 'lwp_user', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Engagement'
  },
  {
    id: 'average-activity-entries-per-student-pp',
    name: 'Average Activity Entries per Student (Pupil Premium)',
    description: 'Mean number of activity-specific entries per Pupil Premium student across the time period',
    calculation: 'Total activity entries for Pupil Premium pupils ÷ Total unique Pupil Premium pupils with activity entries',
    dataSources: ['lwp_pupil_feedback', 'lwp_pupil_feedback_history', 'lwp_pupil', 'lwp_user', 'lwp_school'],
    refreshRate: 'Weekly',
    category: 'Engagement'
  }
]

export default function DataDictionary() {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [showERD, setShowERD] = useState(false)

  const filteredMetrics = METRICS.filter(metric =>
    metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    metric.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    metric.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleCard = (metricId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(metricId)) {
      newExpanded.delete(metricId)
    } else {
      newExpanded.add(metricId)
    }
    setExpandedCards(newExpanded)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Population': return <Database className={styles.categoryIcon} />
      case 'Demographics': return <Users className={styles.categoryIcon} />
      case 'Engagement': return <Activity className={styles.categoryIcon} />
      case 'Reading': return <BookOpen className={styles.categoryIcon} />
      case 'Volume': return <BarChart3 className={styles.categoryIcon} />
      case 'Media': return <Camera className={styles.categoryIcon} />
      case 'Quality': return <Star className={styles.categoryIcon} />
      default: return <Book className={styles.categoryIcon} />
    }
  }

  return (
    <main className={styles.main}>
          <div className={styles.header}>
            <h1>
              <Book className={styles.headerIcon} />
              Data Dictionary
            </h1>
            <p className={styles.subtitle}>
              Understand what our metrics mean, how they're calculated, and where the data comes from
            </p>
            <div className={styles.headerActions}>
              <button 
                onClick={() => setShowERD(!showERD)}
                className={`${styles.erdButton} ${showERD ? styles.active : ''}`}
              >
                <GitBranch className={styles.buttonIcon} />
                {showERD ? 'Hide' : 'Show'} Data Model
              </button>
            </div>
          </div>

          {showERD && (
            <div className={styles.erdSection}>
              <div className={styles.erdHeader}>
                <h2>
                  <Database className={styles.sectionIcon} />
                  Analytics Data Model
                </h2>
                <p className={styles.erdDescription}>
                  This diagram shows how our analytics data flows from source tables into the summary table that powers the impact dashboard metrics.
                </p>
              </div>
              <div className={styles.erdContainer}>
                <pre className="mermaid">
{`erDiagram
    analytics_impact_metrics {
        int id PK
        uuid school_id FK "NULL for all-schools"
        varchar metric_name "e.g. pupils_active, parents_registered"
        int year "2022, 2023, 2024"
        varchar student_type "all, pupil_premium, percentage_pp, percentage_all"
        decimal value "The metric value"
        jsonb metadata "category, description, unit, updated_at"
        timestamp created_at
        timestamp updated_at
    }

    lwp_school {
        uuid id PK
        varchar schoolName
        boolean isTestSchool
        timestamp logCreatedAt
    }

    lwp_pupil {
        uuid id PK
        uuid schoolId FK
        boolean isPremium "Pupil Premium status"
        timestamp logCreatedAt
    }

    lwp_user {
        uuid id PK
        varchar type "PARENT, TEACHER, etc"
        varchar userStatus "ACTIVE, ACCOUNTLESS"
        varchar firstname
        varchar lastname
        timestamp logCreatedAt
    }

    lwp_pupil_feedback {
        uuid id PK
        uuid logCreatedById FK "Parent user ID"
        uuid userId FK "Parent user ID"
        uuid activityId FK
        int periodIndex "Academic year"
        varchar type "READING, ACTIVITY"
        boolean isMaths
        boolean isEnglish
        text pupilComment
        text parentComment
        text comment
        timestamp logCreatedAt
    }

    lwp_pupil_feedback_history {
        uuid id PK
        uuid lwpPupilFeedbackId FK
        uuid lwpPupilId FK
        timestamp logCreatedAt
    }

    lwp_pupil_feedback_media {
        uuid id PK
        uuid feedbackId FK
        varchar type "PHOTO, AUDIO"
        varchar filename
        timestamp logCreatedAt
    }

    lwp_pupil_activity {
        uuid id PK
        uuid pupilId FK
        uuid topicId FK
        uuid activityId FK
        int rating "1-5 stars"
        boolean earnedStar
        timestamp logCreatedAt
    }

    lwp_pupil_topic {
        uuid id PK
        uuid pupilId FK
        uuid topicId FK
        int periodIndex "Academic year"
        boolean watchedVideo
        boolean earnedGoldStar
        int silverStars
        int readingTarget
        date releaseDate
        timestamp logCreatedAt
    }

    lwp_pupil_parent {
        uuid id PK
        uuid parentId FK
        uuid pupilId FK
        varchar status "ACTIVE, INACTIVE"
        timestamp logCreatedAt
    }

    static_lwp_topic {
        uuid id PK
        varchar teacherTopicName
        boolean isReading
        timestamp logCreatedAt
    }

    %% Relationships
    analytics_impact_metrics ||--o{ lwp_school : "school_id"
    
    lwp_pupil ||--o{ lwp_school : "schoolId"
    lwp_pupil ||--o{ lwp_pupil_feedback_history : "lwpPupilId"
    lwp_pupil ||--o{ lwp_pupil_activity : "pupilId"
    lwp_pupil ||--o{ lwp_pupil_topic : "pupilId"
    lwp_pupil ||--o{ lwp_pupil_parent : "pupilId"
    
    lwp_user ||--o{ lwp_pupil_feedback : "logCreatedById"
    lwp_user ||--o{ lwp_pupil_feedback : "userId"
    lwp_user ||--o{ lwp_pupil_parent : "parentId"
    
    lwp_pupil_feedback ||--o{ lwp_pupil_feedback_history : "lwpPupilFeedbackId"
    lwp_pupil_feedback ||--o{ lwp_pupil_feedback_media : "feedbackId"
    lwp_pupil_feedback ||--o{ lwp_pupil_activity : "activityId"
    
    lwp_pupil_topic ||--o{ lwp_pupil_activity : "topicId"
    lwp_pupil_topic ||--o{ static_lwp_topic : "topicId"

    %% Data flow annotations
    lwp_pupil_feedback }|--|| analytics_impact_metrics : "Entry data aggregated by metric"
    lwp_pupil_activity }|--|| analytics_impact_metrics : "Activity completion metrics"
    lwp_pupil_topic }|--|| analytics_impact_metrics : "Video watching metrics"
    lwp_pupil_feedback_media }|--|| analytics_impact_metrics : "Media upload metrics"`}
                </pre>
              </div>
              <div className={styles.erdLegend}>
                <h3>Key Relationships - Normalized EAV Model</h3>
                <ul>
                  <li><strong>Source Tables:</strong> Raw data from the platform (lwp_* tables)</li>
                  <li><strong>Metrics Table:</strong> Normalized Entity-Attribute-Value structure for flexible metric storage</li>
                  <li><strong>Metric Names:</strong> pupils_active, parents_registered, pupils_watched_video, etc.</li>
                  <li><strong>Student Types:</strong> 'all', 'pupil_premium', 'percentage_pp', 'percentage_all'</li>
                  <li><strong>Metadata:</strong> JSON field containing category, description, unit, and timestamps</li>
                  <li><strong>School Filtering:</strong> NULL school_id represents all-schools aggregation</li>
                  <li><strong>Extensibility:</strong> Add new metrics without schema changes - just new rows</li>
                </ul>
              </div>
            </div>
          )}

          <div className={styles.searchSection}>
            <div className={styles.searchContainer}>
              <Search className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search metrics by name, description, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.searchResults}>
              {searchTerm && (
                <span className={styles.resultsCount}>
                  {filteredMetrics.length} metric{filteredMetrics.length !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
          </div>

          <div className={styles.metricsGrid}>
            {filteredMetrics.map(metric => {
              const isExpanded = expandedCards.has(metric.id)
              return (
                <div 
                  key={metric.id} 
                  className={`${styles.metricCard} ${isExpanded ? styles.expanded : ''}`}
                >
                  <div 
                    className={styles.cardHeader}
                    onClick={() => toggleCard(metric.id)}
                  >
                    <div className={styles.cardTitle}>
                      <div className={styles.categoryBadge}>
                        {getCategoryIcon(metric.category)}
                        <span>{metric.category}</span>
                      </div>
                      <h3>{metric.name}</h3>
                      <p className={styles.description}>{metric.description}</p>
                    </div>
                    <div className={styles.expandButton}>
                      {isExpanded ? (
                        <ChevronUp className={styles.expandIcon} />
                      ) : (
                        <ChevronDown className={styles.expandIcon} />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={styles.cardDetails}>
                      <div className={styles.detailSection}>
                        <div className={styles.detailHeader}>
                          <Calculator className={styles.detailIcon} />
                          <h4>Calculation Method</h4>
                        </div>
                        <p className={styles.detailContent}>{metric.calculation}</p>
                      </div>

                      <div className={styles.detailSection}>
                        <div className={styles.detailHeader}>
                          <Database className={styles.detailIcon} />
                          <h4>Data Sources</h4>
                        </div>
                        <ul className={styles.dataSourcesList}>
                          {metric.dataSources.map(source => (
                            <li key={source} className={styles.dataSource}>{source}</li>
                          ))}
                        </ul>
                      </div>

                      <div className={styles.detailSection}>
                        <div className={styles.detailHeader}>
                          <Clock className={styles.detailIcon} />
                          <h4>Refresh Rate</h4>
                        </div>
                        <p className={styles.detailContent}>{metric.refreshRate}</p>
                      </div>

                      <div className={styles.detailSection}>
                        <div className={styles.detailHeader}>
                          <span className={styles.placeholderIcon}>📝</span>
                          <h4>Limitations</h4>
                        </div>
                        <p className={styles.detailContent}>
                          <em>To be documented</em>
                        </p>
                      </div>

                      <div className={styles.detailSection}>
                        <div className={styles.detailHeader}>
                          <span className={styles.placeholderIcon}>👤</span>
                          <h4>Owner</h4>
                        </div>
                        <p className={styles.detailContent}>
                          <em>To be assigned</em>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {filteredMetrics.length === 0 && searchTerm && (
            <div className={styles.noResults}>
              <Book className={styles.noResultsIcon} />
              <h3>No metrics found</h3>
              <p>Try adjusting your search terms or browse all available metrics.</p>
              <button 
                onClick={() => setSearchTerm('')}
                className={styles.clearSearchButton}
              >
                Clear search
              </button>
            </div>
          )}
        </main>
  )
} 
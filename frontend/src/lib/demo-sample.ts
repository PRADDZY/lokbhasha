export type DemoSample = {
  id: string
  title: string
  summary: string
  marathiText: string
  suggestedLocales: string[]
}

export const DEMO_SAMPLE: DemoSample = {
  id: 'school-supplies-circular',
  title: 'District school-supplies circular',
  summary:
    'A district education circular about student supply applications, deadlines, and required school approvals.',
  marathiText:
    'सदर अधिसूचनेन्वये जिल्हा परिषद शाळांमधील इयत्ता पहिली ते आठवीच्या विद्यार्थ्यांसाठी शैक्षणिक साहित्य वितरणासाठी अर्ज दिनांक २५ एप्रिल २०२६ पर्यंत तालुका शिक्षण अधिकाऱ्याकडे सादर करावा. अर्जासोबत विद्यार्थी नोंद, शाळेचा शिक्का आणि मुख्याध्यापकांची स्वाक्षरी जोडणे आवश्यक आहे.',
  suggestedLocales: ['hi', 'gu', 'bn'],
}

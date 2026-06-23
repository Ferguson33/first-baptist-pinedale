export interface Missionary {
  name: string;
  field: string;
  country: string;
  org: string;
  photo?: string; // Path relative to /public, e.g. "/images/Missionaries/babalola.jpg"
}

export const missionaries: Missionary[] = [
  {
    name: "Shay and Abigail Babalola",
    field: "Nigeria",
    country: "Nigeria",
    org: "International Baptist",
    photo: "/images/Missionaries/babalola.jpg",
  },
  {
    name: "Alex and Nicole Boyle",
    field: "Namibia",
    country: "South Africa",
    org: "New",
    photo: "/images/Missionaries/boyle.jpg",
  },
  {
    name: "Terry and Wendy Broyles",
    field: "Brazil",
    country: "Brazil",
    org: "Broyles to Brazil",
    photo: "/images/Missionaries/broyles.jpg",
  },
  {
    name: "Larrie and Carol Bunyan",
    field: "Montana, United States",
    country: "United States",
    org: "Independent Faith Mission",
    photo: "/images/Missionaries/bunyan.jpg",
  },
  {
    name: "Dr. Terry & Dr. Peggy Ellis",
    field: "Dalton GA",
    country: "United States",
    org: "Rock of Ages Prison Ministry",
    photo: "/images/Missionaries/ellis.jpg",
  },
  {
    name: "Heath & Tessa Holmes",
    field: "Pinedale, Wy",
    country: "United States",
    org: "First Baptist Church",
    photo: "/images/pastors/holmes-couple.jpg",
  },
  {
    name: "Carolyn Hultquist",
    field: "Pinedale, Wy",
    country: "United States",
    org: "New",
    photo: "/images/Missionaries/hultquist.jpg",
  },
  {
    name: "Dan and Dee Kowach",
    field: "Daegu, South Korea",
    country: "South Korea",
    org: "Baptist World Mission",
    photo: "/images/Missionaries/kowach.jpg",
  },
  {
    name: "Bob and Joyce Landis",
    field: "United States",
    country: "United States",
    org: "MTT Ministries",
    photo: "/images/Missionaries/landis.jpg",
  },
  {
    name: "Lonita Lohse",
    field: "Papua New Guinea",
    country: "Papua New Guinea",
    org: "Baptist World Mission",
    photo: "/images/Missionaries/lohse.jpg",
  },
  {
    name: "Dean and Lorie Loftus",
    field: "United States",
    country: "United States",
    org: "Red Cliff Bible Camp",
    photo: "/images/Missionaries/loftus.jpg",
  },
  {
    name: "Joe and Gail Owens",
    field: "Cordoba, Argentina",
    country: "Argentina",
    org: "Argentina International",
    photo: "/images/Missionaries/owens.jpg",
  },
  {
    name: "Russell Posey",
    field: "Siberia & Alaska",
    country: "United States",
    org: "New",
    // photo: "/images/Missionaries/posey.jpg"
  },
  {
    name: "Elsa Ramirez",
    field: "Tijuana, Baja Calif",
    country: "Mexico",
    org: "World Wide New Testament",
    photo: "/images/Missionaries/ramirez-elsa.jpg",
  },
  {
    name: "Keith & Leslie Rheinheimer",
    field: "United States",
    country: "United States",
    org: "Fundamental Baptist",
    photo: "/images/Missionaries/rheinheimer.jpg",
  },
];

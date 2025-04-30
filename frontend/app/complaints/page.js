import {
    OneStarsIcon,
    TwoStarsIcon,
    ThreeStarsIcon,
    FiveStarsIcon,
  } from "../../assets";
  import { useState } from "react";
  
  const Complaints = () => {
    const [highlightedComplainID, setHighlightedComplainID] = useState(1);
  
    const handleCardHighlight = (id) => {
      setHighlightedComplainID(id);
    };
  
    const complaintsData = [
      {
        id: 1,
        name: "Moses Jeremiah",
        rating: "2.0",
        stars: TwoStarsIcon,
      },
      {
        id: 2,
        name: "Miebi Zighan",
        rating: "3.0",
        stars: ThreeStarsIcon,
      },
      {
        id: 3,
        name: "Abdullahi Usman",
        rating: "5.0",
        stars: FiveStarsIcon,
      },
      {
        id: 4,
        name: "Kemepade Ipigansi",
        rating: "1.0",
        stars: OneStarsIcon,
      },
      {
        id: 5,
        name: "Opuene Ipigansi",
        rating: "3.0",
        stars: ThreeStarsIcon,
      },
      {
        id: 6,
        name: "Hauwa Zakariya",
        rating: "1.0",
        stars: OneStarsIcon,
      },
      {
        id: 7,
        name: "Bolaji Akinyemi",
        rating: "2.0",
        stars: TwoStarsIcon,
      },
    ];
  
    const RatingsCard = ({ name, stars, id }) => {
      return (
        <div
          className={`px-3.5 py-5 cursor-pointer 
            ${
              highlightedComplainID === id
                ? `bg-[#227580] text-[#f0f0f0]  ${
                    highlightedComplainID === 1 && "rounded-t-lg"
                  } ${highlightedComplainID === 7 && "rounded-b-lg"}`
                : ""
            }  border-b-[1.4px]  border-[#c7c7c73d]`}
          onClick={() => handleCardHighlight(id)}
        >
          <p className="text-[13px] font-semibold">{name}</p>
          <div>
            <img src={stars} alt="stars icon" width={100} />
          </div>
        </div>
      );
    };
  
    return (
      <main className="flex flex-col gap-5 bg-white px-3 py-4 rounded-lg border-[1px] border-gray-200">
        {/* heading section */}
        <div>
          <h2 className="font-bold text-[13px]">Manage Complaints</h2>
          <p className="text-[11px] text-gray-500">See comments and ratings</p>
        </div>
  
        {/* body section */}
        <div className="flex gap-2 rounded-lg">
          {/* left */}
          <div className="w-[30%] rounded-lg bg-[#FAFAFB] border-[1.4px]  border-[#c7c7c73d] hidden md:block">
            {complaintsData.map((complain) => {
              return (
                <RatingsCard
                  key={complain.id}
                  name={complain.name}
                  stars={complain.stars}
                  id={complain.id}
                />
              );
            })}
          </div>
  
          {/* right */}
          <div className="lg:w-[70%] w-full rounded-lg bg-[#FAFAFB] pb-8">
            {/* top */}
            <div className="w-full pt-12">
              {complaintsData
                .filter((complain) => complain.id === highlightedComplainID)
                .map((complain) => {
                  return (
                    <div
                      key={complain.id}
                      className="max-w-[300px] mx-auto flex flex-col items-center"
                    >
                      <h2 className="font-bold text-[18px]">{complain.name}</h2>
                      <p className="text-[9px]">RATED YOU {complain.rating}</p>
                      <div>
                        <img
                          src={complain.stars}
                          alt={complain.name}
                          width={70}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
  
            {/* bottom */}
            <div className="text-center bg-white px-8 pt-8 pb-5 text-[10px] w-[80%] mx-auto rounded-lg border-[1px] border-[#c7c7c73d] flex flex-col gap-14 mt-4">
              <p className="max-w-[280px] mx-auto">
                I've been facing a recurring issue when trying to clock in and
                clock out of the system. Sometimes the app freezes or crashes just
                as I'm about to log my time, which causes delays. On top of that,
                the internet connection at the hub has been unstable lately, which
                makes it even harder to access the system and complete my tasks.
              </p>
  
              <p className="text-gray-500">Sent 2 days ago</p>
            </div>
          </div>
        </div>
      </main>
    );
  };
  
  export default Complaints;